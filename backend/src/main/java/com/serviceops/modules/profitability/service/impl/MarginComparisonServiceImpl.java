package com.serviceops.modules.profitability.service.impl;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.profitability.dto.response.PlannedVsActualMarginRes;
import com.serviceops.modules.profitability.service.MarginComparisonService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.entity.QuoteItem;
import com.serviceops.modules.quotation.repository.QuoteRepository;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-09-CN-006 — So sánh biên lợi nhuận dự kiến (lúc báo giá) với biên lợi nhuận thực tế của dự án.
 *
 * <p>Nguồn "kế hoạch" là báo giá mới nhất đã dùng sẵn cho hợp đồng của dự án ({@code Contract#quoteId}
 * — NCL-04-CN-001). Báo giá chỉ có doanh thu dự kiến (đơn giá bán theo vai trò × số ngày công) chứ
 * chưa gắn với nhân sự cụ thể (lập trước khi giao việc), nên chi phí dự kiến ở đây là ước tính: chi phí
 * giờ công bình quân của các nhân sự hiện đang giữ cùng vai trò chuyên môn với từng dòng báo giá, tại
 * thời điểm lập báo giá. Nguồn "thực tế" tính từ mọi dòng giờ công đã duyệt của dự án tính đến hiện tại,
 * cùng công thức với NCL-09-CN-005 qua {@link EntryMarginCalculator}.</p>
 */
@Service
@RequiredArgsConstructor
// Không readOnly: nhật ký xem dữ liệu nhạy cảm ghi cùng transaction (QTN-03); giao dịch chỉ đọc làm MySQL từ chối lệnh ghi và trả 500.
@Transactional
public class MarginComparisonServiceImpl implements MarginComparisonService {

	private final ProjectRepository projectRepository;
	private final ContractRepository contractRepository;
	private final QuoteRepository quoteRepository;
	private final TaskRepository taskRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final EmployeeRepository employeeRepository;
	private final EmployeeHourlyRateService employeeHourlyRateService;
	private final EntryMarginCalculator entryMarginCalculator;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	@Override
	public PlannedVsActualMarginRes compare(Long projectId) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + projectId));

		Contract contract = contractRepository.findById(project.getContractId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi ID: " + project.getContractId()));

		// TC-02: du an (qua hop dong) chua gan bao gia nao -> khong co du lieu ke hoach de so sanh.
		if (contract.getQuoteId() == null) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
					"Du an chua co bao gia nao gan kem de so sanh bien du kien voi thuc te");
		}
		Quote quote = quoteRepository.findById(contract.getQuoteId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay bao gia voi ID: " + contract.getQuoteId()));

		PlannedFigures planned = computePlanned(quote);
		ActualFigures actual = computeActual(project);

		BigDecimal marginGap = (planned.marginPercent() != null && actual.marginPercent() != null)
				? actual.marginPercent().subtract(planned.marginPercent()).setScale(2, RoundingMode.HALF_UP)
				: null;
		BigDecimal plannedHours = planned.workDays().multiply(EntryMarginCalculator.STANDARD_HOURS_PER_DAY);
		BigDecimal hoursVariance = actual.hours().subtract(plannedHours);

		List<String> gapReasons = buildGapReasons(hoursVariance, planned, actual);

		sensitiveAccessLogger.logView(SensitiveDataType.MARGIN, projectId, "PlannedVsActualMargin",
				"Xem so sanh bien loi nhuan du kien va thuc te cua du an #" + projectId);

		return new PlannedVsActualMarginRes(projectId, quote.getId(), quote.getVersion(),
				planned.workDays(), planned.revenue(), planned.cost(), planned.margin(), planned.marginPercent(),
				actual.hours(), actual.revenue(), actual.cost(), actual.margin(), actual.marginPercent(),
				marginGap, hoursVariance, gapReasons,
				planned.missingCostItemCount(), actual.missingCostEntryCount(), actual.missingRevenueEntryCount());
	}

	/** Doanh thu tu {@code Quote#totalAmount}; chi phi uoc tinh tu chi phi gio cong binh quan theo vai tro. */
	private PlannedFigures computePlanned(Quote quote) {
		LocalDate asOf = quote.getCreatedAt().toLocalDate();
		BigDecimal workDays = BigDecimal.ZERO;
		BigDecimal cost = BigDecimal.ZERO;
		int missingCostItemCount = 0;

		for (QuoteItem item : quote.getItems()) {
			workDays = workDays.add(item.getWorkDays());

			BigDecimal avgHourlyCost = averageHourlyCostForRole(item.getProfessionalRole(), asOf);
			if (avgHourlyCost == null) {
				missingCostItemCount++;
				continue;
			}
			BigDecimal itemCost = item.getWorkDays().multiply(EntryMarginCalculator.STANDARD_HOURS_PER_DAY)
					.multiply(avgHourlyCost).setScale(2, RoundingMode.HALF_UP);
			cost = cost.add(itemCost);
		}

		BigDecimal revenue = quote.getTotalAmount() == null ? BigDecimal.ZERO : quote.getTotalAmount();
		BigDecimal margin = revenue.subtract(cost);
		return new PlannedFigures(workDays, revenue, cost, margin, marginPercent(margin, revenue), missingCostItemCount);
	}

	/** Trung binh cong chi phi gio cong (theo gio) cua cac nhan su dang giu vai tro nay; null neu khong uoc tinh duoc. */
	private BigDecimal averageHourlyCostForRole(String professionalRole, LocalDate asOf) {
		String role = professionalRole == null ? "" : professionalRole.trim();
		if (role.isBlank()) {
			return null;
		}
		List<Employee> employees = employeeRepository.findByProfessionalRoleIgnoreCase(role);
		if (employees.isEmpty()) {
			return null;
		}
		BigDecimal sum = BigDecimal.ZERO;
		int count = 0;
		for (Employee employee : employees) {
			ResolvedEmployeeHourlyRateRes resolved = employeeHourlyRateService.resolve(employee.getId(), asOf);
			if (!resolved.missingCostData()) {
				sum = sum.add(resolved.hourlyRate());
				count++;
			}
		}
		if (count == 0) {
			return null;
		}
		return sum.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP);
	}

	/** Doanh thu/gia von thuc te tu moi dong gio cong DA DUYET cua du an tinh den hien tai. */
	private ActualFigures computeActual(Project project) {
		List<Long> taskIds = taskRepository.findByProjectIdOrderByIdAsc(project.getId()).stream()
				.map(Task::getId).toList();
		if (taskIds.isEmpty()) {
			return new ActualFigures(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null, 0, 0);
		}

		List<TimeEntry> entries = timeEntryRepository
				.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(taskIds, TimeEntryStatus.APPROVED);
		if (entries.isEmpty()) {
			return new ActualFigures(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null, 0, 0);
		}

		Map<Long, Employee> employeesByUserId = employeeRepository
				.findByUser_IdIn(entries.stream().map(TimeEntry::getUserId).distinct().toList()).stream()
				.collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		BigDecimal hours = BigDecimal.ZERO;
		BigDecimal revenue = BigDecimal.ZERO;
		BigDecimal cost = BigDecimal.ZERO;
		int missingCost = 0;
		int missingRevenue = 0;

		for (TimeEntry entry : entries) {
			Employee employee = employeesByUserId.get(entry.getUserId());
			if (employee == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so nhan su cua dong gio cong voi ID: " + entry.getId());
			}
			EntryMarginCalculator.Result resolved = entryMarginCalculator.resolve(entry, employee, project.getContractId());
			hours = hours.add(entry.getHours());
			revenue = revenue.add(resolved.revenue());
			cost = cost.add(resolved.cost());
			if (resolved.missingCost()) {
				missingCost++;
			}
			if (resolved.missingRevenue()) {
				missingRevenue++;
			}
		}

		BigDecimal margin = revenue.subtract(cost);
		return new ActualFigures(hours, revenue, cost, margin, marginPercent(margin, revenue), missingCost, missingRevenue);
	}

	private static List<String> buildGapReasons(BigDecimal hoursVariance, PlannedFigures planned, ActualFigures actual) {
		List<String> reasons = new ArrayList<>();
		if (hoursVariance.compareTo(BigDecimal.ZERO) > 0) {
			BigDecimal excessDays = hoursVariance.divide(EntryMarginCalculator.STANDARD_HOURS_PER_DAY, 2, RoundingMode.HALF_UP);
			reasons.add("Gio cong thuc te vuot ke hoach " + hoursVariance.setScale(2, RoundingMode.HALF_UP)
					+ " gio (tuong duong " + excessDays + " ngay cong).");
		}

		BigDecimal plannedHours = planned.workDays().multiply(EntryMarginCalculator.STANDARD_HOURS_PER_DAY);
		BigDecimal plannedHourlyCost = plannedHours.compareTo(BigDecimal.ZERO) > 0
				? planned.cost().divide(plannedHours, 2, RoundingMode.HALF_UP) : null;
		BigDecimal actualHourlyCost = actual.hours().compareTo(BigDecimal.ZERO) > 0
				? actual.cost().divide(actual.hours(), 2, RoundingMode.HALF_UP) : null;
		if (plannedHourlyCost != null && actualHourlyCost != null && actualHourlyCost.compareTo(plannedHourlyCost) > 0) {
			reasons.add("Chi phi gio cong thuc te binh quan (" + actualHourlyCost
					+ "/gio) cao hon du kien (" + plannedHourlyCost + "/gio).");
		}
		return reasons;
	}

	/** Null khi doanh thu bang 0 (khong the tinh %) — thay vi chia cho 0. */
	private static BigDecimal marginPercent(BigDecimal margin, BigDecimal revenue) {
		if (revenue.compareTo(BigDecimal.ZERO) == 0) {
			return null;
		}
		return margin.multiply(new BigDecimal("100")).divide(revenue, 2, RoundingMode.HALF_UP);
	}

	private record PlannedFigures(BigDecimal workDays, BigDecimal revenue, BigDecimal cost, BigDecimal margin,
								   BigDecimal marginPercent, int missingCostItemCount) {
	}

	private record ActualFigures(BigDecimal hours, BigDecimal revenue, BigDecimal cost, BigDecimal margin,
								  BigDecimal marginPercent, int missingCostEntryCount, int missingRevenueEntryCount) {
	}
}
