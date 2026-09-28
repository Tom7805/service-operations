package com.serviceops.modules.profitability.service.impl;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.profitability.dto.response.ProfitForecastRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.ProfitForecastService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * NCL-09-CN-007 — Dự báo lợi nhuận tới khi kết thúc dự án.
 *
 * <p>Dùng lại {@link LaborCostService} (NCL-09-CN-001) và {@link RevenueRecognitionService}
 * (NCL-09-CN-002) để lấy chi phí/doanh thu thực tế tính đến hiện tại, cùng
 * {@code Task.budgetHours} (NCL-05-CN-005) làm mốc ngân sách giờ công của dự án — tránh lặp lại
 * công thức tính giá vốn/doanh thu vốn đã có, giống cách {@code ProjectMarginServiceImpl} và
 * {@code MarginComparisonServiceImpl} tái dùng các service này.</p>
 */
@Service
@RequiredArgsConstructor
// Khong duoc readOnly: sensitiveAccessLogger.logView(...) ben duoi GHI mot dong audit log trong
// cung transaction nay (xem giai thich o LaborCostServiceImpl), va service nay cung goi
// LaborCostService/RevenueRecognitionService - ca hai cung ghi audit log trong cung giao dich.
@Transactional
public class ProfitForecastServiceImpl implements ProfitForecastService {

	private final ProjectRepository projectRepository;
	private final ContractRepository contractRepository;
	private final TaskRepository taskRepository;
	private final LaborCostService laborCostService;
	private final RevenueRecognitionService revenueRecognitionService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	@Override
	public ProfitForecastRes forecast(Long projectId) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + projectId));
		Contract contract = contractRepository.findById(project.getContractId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi ID: " + project.getContractId()));

		List<Task> tasks = taskRepository.findByProjectIdOrderByIdAsc(projectId);
		BigDecimal budgetHours = tasks.stream()
				.map(Task::getBudgetHours)
				.filter(Objects::nonNull)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		int totalTaskCount = tasks.size();
		int doneTaskCount = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
		BigDecimal taskCompletionRate = totalTaskCount == 0 ? null
				: BigDecimal.valueOf(doneTaskCount).divide(BigDecimal.valueOf(totalTaskCount), 4, RoundingMode.HALF_UP);

		ProjectLaborCostRes laborCost = laborCostService.calculateProjectLaborCost(projectId);
		RecognizedRevenueRes revenue = revenueRecognitionService.calculateRecognizedRevenue(projectId);

		BigDecimal actualHours = laborCost.totalApprovedHours();
		BigDecimal actualCost = laborCost.totalLaborCost();
		BigDecimal actualRevenue = revenue.totalRecognizedRevenue();
		BigDecimal actualMargin = actualRevenue.subtract(actualCost).setScale(2, RoundingMode.HALF_UP);
		BigDecimal actualMarginPercent = marginPercent(actualMargin, actualRevenue);

		boolean hasBudget = budgetHours.signum() > 0;
		boolean overBudget = hasBudget && actualHours.compareTo(budgetHours) > 0;

		List<String> warnings = new ArrayList<>();
		BigDecimal remainingHours;
		BigDecimal estimatedTotalHoursAtCompletion;

		if (overBudget) {
			// TC-02: da vuot ngan sach, ngan sach khong con la moc tin cay -> ngoai suy theo toc do
			// tieu hao thuc te qua ty le hoan thanh cong viec (chi tin cay khi con dang lam do, 0% < ty le < 100%).
			if (taskCompletionRate != null && taskCompletionRate.signum() > 0
					&& taskCompletionRate.compareTo(BigDecimal.ONE) < 0) {
				estimatedTotalHoursAtCompletion = actualHours.divide(taskCompletionRate, 2, RoundingMode.HALF_UP);
				remainingHours = estimatedTotalHoursAtCompletion.subtract(actualHours);
			} else {
				// Khong co ty le hoan thanh dang tin cay de ngoai suy (chua co cong viec nao, hoac da
				// xong 100% nhung van con dong gio moi phat sinh) -> coi nhu khong con gio phai lam them.
				estimatedTotalHoursAtCompletion = actualHours;
				remainingHours = BigDecimal.ZERO;
			}
			warnings.add("Du an da vuot ngan sach gio cong (" + actualHours + "/" + budgetHours
					+ " gio) - phan con lai duoc uoc tinh theo toc do tieu hao thuc te.");
		} else if (hasBudget) {
			// TC-01: chua vuot ngan sach -> phan con lai chinh la phan ngan sach chua dung.
			remainingHours = budgetHours.subtract(actualHours);
			estimatedTotalHoursAtCompletion = budgetHours;
		} else {
			remainingHours = BigDecimal.ZERO;
			estimatedTotalHoursAtCompletion = actualHours;
			warnings.add("Du an chua khai bao ngan sach gio cong cho cong viec nao - khong the du bao gio con lai.");
		}

		BigDecimal averageHourlyCost = actualHours.signum() > 0
				? actualCost.divide(actualHours, 4, RoundingMode.HALF_UP) : null;
		BigDecimal forecastCost = averageHourlyCost == null
				? actualCost
				: actualCost.add(remainingHours.multiply(averageHourlyCost)).setScale(2, RoundingMode.HALF_UP);

		BigDecimal forecastRevenue = forecastRevenue(contract, revenue, actualRevenue, remainingHours);

		BigDecimal forecastMargin = forecastRevenue.subtract(forecastCost).setScale(2, RoundingMode.HALF_UP);
		BigDecimal forecastMarginPercent = marginPercent(forecastMargin, forecastRevenue);

		boolean riskOfLoss = forecastMargin.signum() < 0;
		if (riskOfLoss) {
			warnings.add("Bien loi nhuan du bao khi ket thuc du an bi am - nguy co du an lo.");
		}

		BigDecimal marginVariance = (forecastMarginPercent != null && actualMarginPercent != null)
				? forecastMarginPercent.subtract(actualMarginPercent).setScale(2, RoundingMode.HALF_UP)
				: null;

		sensitiveAccessLogger.logView(SensitiveDataType.MARGIN, projectId, "ProfitForecast",
				"Xem du bao loi nhuan toi khi ket thuc du an #" + projectId);

		return new ProfitForecastRes(projectId, budgetHours, actualHours, remainingHours, overBudget,
				taskCompletionRate, estimatedTotalHoursAtCompletion,
				actualRevenue, actualCost, actualMargin, actualMarginPercent,
				forecastRevenue, forecastCost, forecastMargin, forecastMarginPercent,
				marginVariance, riskOfLoss, warnings);
	}

	/**
	 * Hop dong tron goi (PERCENTAGE_OF_COMPLETION): doanh thu khi hoan thanh la tron gia tri hop
	 * dong, khong phu thuoc so gio. Hop dong theo gio (HOURLY): cong them phan gio con lai nhan
	 * don gia ban binh quan thuc te (tong doanh thu da ghi nhan / tong gio tinh phi da duyet).
	 */
	private static BigDecimal forecastRevenue(Contract contract, RecognizedRevenueRes revenue,
			BigDecimal actualRevenue, BigDecimal remainingHours) {
		if (revenue.recognitionMethod() == RecognitionMethod.PERCENTAGE_OF_COMPLETION) {
			return contract.getTotalValue();
		}
		BigDecimal billableHours = revenue.totalBillableHours() == null ? BigDecimal.ZERO : revenue.totalBillableHours();
		if (billableHours.signum() <= 0) {
			return actualRevenue;
		}
		BigDecimal averageHourlyRevenue = actualRevenue.divide(billableHours, 4, RoundingMode.HALF_UP);
		return actualRevenue.add(remainingHours.multiply(averageHourlyRevenue)).setScale(2, RoundingMode.HALF_UP);
	}

	/** Null khi doanh thu bang 0 (khong the tinh %) — thay vi chia cho 0. */
	private static BigDecimal marginPercent(BigDecimal margin, BigDecimal revenue) {
		if (revenue == null || revenue.compareTo(BigDecimal.ZERO) == 0) {
			return null;
		}
		return margin.multiply(new BigDecimal("100")).divide(revenue, 2, RoundingMode.HALF_UP);
	}
}
