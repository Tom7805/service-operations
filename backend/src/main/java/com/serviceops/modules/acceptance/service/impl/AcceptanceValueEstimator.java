package com.serviceops.modules.acceptance.service.impl;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes.TaskValueRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes.ValueSuggestionRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.dto.response.RevenueLineRes;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Goi y "Gia tri nghiem thu" cua mot nhanh hang muc tu chinh cac cong viec trong nhanh, de Quan ly du an khong
 * phai tu cong tay (va go nham) — cung cong thuc doanh thu ghi nhan NCL-09-CN-002 nen so goi y khop man Doanh
 * thu cua du an:
 * <ul>
 *   <li>TIME_AND_MATERIAL: tong doanh thu cac dong gio cong da duyet, tinh phi cua cong viec trong nhanh (gio x
 *       don gia ngay / 8) — lay nguyen cac dong cua {@link RevenueRecognitionService} (service do da ghi nhat ky
 *       xem doanh thu, QTN-03).</li>
 *   <li>FIXED_PRICE: gia tri hop dong chia deu theo so cong viec cua du an (cung ty le hoan thanh ma doanh thu
 *       ghi nhan dung), nhan so cong viec cua nhanh.</li>
 *   <li>Loai hop dong khac, du an khong gan hop dong: khong goi y — nguoi lap nhap theo thoa thuan.</li>
 * </ul>
 * Chi la goi y: nguoi lap van sua duoc truoc khi lap phieu, backend khong ep gia tri phieu bang so nay.
 */
@Component
@RequiredArgsConstructor
public class AcceptanceValueEstimator {

	private final ContractRepository contractRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final RevenueRecognitionService revenueRecognitionService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	/**
	 * @param branchTasks      cong viec cua hang muc va hang muc con chau (noi dung phieu)
	 * @param projectTaskCount tong so cong viec cua du an — mau so khi chia gia tri hop dong tron goi
	 */
	public ValueSuggestionRes estimate(Project project, List<Task> branchTasks, int projectTaskCount) {
		if (project.getContractId() == null || branchTasks.isEmpty()) {
			return null;
		}
		Contract contract = contractRepository.findById(project.getContractId()).orElse(null);
		if (contract == null || contract.getContractType() == null) {
			return null;
		}
		return switch (contract.getContractType()) {
			case TIME_AND_MATERIAL -> byApprovedHours(project, branchTasks, projectTaskCount);
			case FIXED_PRICE -> byTaskShare(project, contract, branchTasks, projectTaskCount);
			case MAINTENANCE, MILESTONE -> null;
		};
	}

	private ValueSuggestionRes byApprovedHours(Project project, List<Task> branchTasks, int projectTaskCount) {
		RecognizedRevenueRes revenue = revenueRecognitionService.calculateRecognizedRevenue(project.getId());
		List<RevenueLineRes> billableLines = revenue.lines().stream().filter(RevenueLineRes::billable).toList();
		Map<Long, Long> taskIdByEntry = new HashMap<>();
		for (TimeEntry entry : timeEntryRepository.findAllById(
				billableLines.stream().map(RevenueLineRes::timeEntryId).toList())) {
			taskIdByEntry.put(entry.getId(), entry.getTaskId());
		}
		Map<Long, List<RevenueLineRes>> linesByTask = new HashMap<>();
		billableLines.forEach(line -> {
			Long taskId = taskIdByEntry.get(line.timeEntryId());
			if (taskId != null) {
				linesByTask.computeIfAbsent(taskId, id -> new ArrayList<>()).add(line);
			}
		});

		BigDecimal total = BigDecimal.ZERO;
		int missingRate = 0;
		List<TaskValueRes> tasks = new ArrayList<>();
		for (Task task : branchTasks) {
			BigDecimal hours = BigDecimal.ZERO;
			BigDecimal value = BigDecimal.ZERO;
			for (RevenueLineRes line : linesByTask.getOrDefault(task.getId(), List.of())) {
				hours = hours.add(line.hours());
				if (line.missingRateData()) {
					missingRate++;
				} else {
					value = value.add(line.lineRevenue());
				}
			}
			tasks.add(new TaskValueRes(task.getId(), task.getName(), hours, value));
			total = total.add(value);
		}
		return new ValueSuggestionRes(RecognitionMethod.HOURLY, total, projectTaskCount, missingRate, tasks);
	}

	private ValueSuggestionRes byTaskShare(Project project, Contract contract, List<Task> branchTasks,
			int projectTaskCount) {
		if (projectTaskCount <= 0 || contract.getTotalValue() == null) {
			return null;
		}
		// Chia deu tung cong viec roi cong lai: tong goi y luon bang dung tong cac dong nguoi lap nhin thay.
		BigDecimal perTask = contract.getTotalValue()
				.divide(BigDecimal.valueOf(projectTaskCount), 0, RoundingMode.HALF_UP);
		List<TaskValueRes> tasks = branchTasks.stream()
				.map(task -> new TaskValueRes(task.getId(), task.getName(), null, perTask))
				.toList();
		sensitiveAccessLogger.logView(SensitiveDataType.REVENUE, project.getId(), "AcceptanceValueSuggestion",
				"Xem gia tri goi y nghiem thu (chia deu gia tri hop dong) cua du an #" + project.getId());
		return new ValueSuggestionRes(RecognitionMethod.PERCENTAGE_OF_COMPLETION,
				perTask.multiply(BigDecimal.valueOf(branchTasks.size())), projectTaskCount, 0, tasks);
	}
}
