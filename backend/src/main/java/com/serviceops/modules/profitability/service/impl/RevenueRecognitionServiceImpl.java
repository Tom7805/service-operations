package com.serviceops.modules.profitability.service.impl;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.dto.response.RevenueLineRes;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;
import com.serviceops.modules.rate.service.RateResolutionService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Tinh doanh thu ghi nhan cua du an (NCL-09-CN-002) — cung mo hinh "tinh dong, khong
 * luu snapshot" voi {@link com.serviceops.modules.profitability.service.impl.LaborCostServiceImpl}
 * (NCL-09-CN-001): moi lan doc deu doc lai gio cong/hop dong hien hanh, khong co bang
 * du lieu rieng nen luon nhat quan voi du lieu goc.
 */
@Service
@RequiredArgsConstructor
// Khong duoc readOnly: sensitiveAccessLogger.logView(...) GHI mot dong audit log trong
// cung transaction nay (xem giai thich o LaborCostServiceImpl).
@Transactional
public class RevenueRecognitionServiceImpl implements RevenueRecognitionService {

	/**
	 * Gia dinh 1 ngay cong = 8 gio, dung de quy doi don gia theo ngay
	 * ({@code bill_rates.daily_rate}, NCL-07-CN-001) sang don gia theo gio khi nhan
	 * voi {@code TimeEntry.hours}. He thong hien khong co truong nao khac the hien
	 * "so gio chuan mot ngay cong" cho muc dich tinh doanh thu (khac voi
	 * {@code Employee.standardHoursPerWeek}, la mau so cua ty le gio tinh phi/QTN-23
	 * danh cho bao cao NCL-11-CN-002) — can Ke toan xac nhan lai gia dinh nay.
	 */
	private static final BigDecimal HOURS_PER_WORKDAY = new BigDecimal("8");

	private final ProjectRepository projectRepository;
	private final ContractRepository contractRepository;
	private final TaskRepository taskRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final EmployeeRepository employeeRepository;
	private final RateResolutionService rateResolutionService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	@Override
	public RecognizedRevenueRes calculateRecognizedRevenue(Long projectId) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + projectId));
		Contract contract = contractRepository.findById(project.getContractId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi ID: " + project.getContractId()));

		RecognizedRevenueRes result = switch (contract.getContractType()) {
			case TIME_AND_MATERIAL -> calculateHourly(project, contract);
			case FIXED_PRICE -> calculatePercentageOfCompletion(project, contract);
			case MAINTENANCE, MILESTONE -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Loai hop dong " + contract.getContractType()
							+ " chua duoc ho tro tinh doanh thu ghi nhan tu dong (NCL-09-CN-002)");
		};

		sensitiveAccessLogger.logView(SensitiveDataType.REVENUE, projectId, "ProjectRecognizedRevenue",
				"Xem doanh thu ghi nhan cua du an #" + projectId);
		return result;
	}

	/** TIME_AND_MATERIAL: tong (gio x don gia ap dung) cua tung dong gio cong da duyet, tinh phi. */
	private RecognizedRevenueRes calculateHourly(Project project, Contract contract) {
		List<Long> taskIds = taskRepository.findByProjectIdOrderByIdAsc(project.getId()).stream()
				.map(Task::getId)
				.toList();

		List<TimeEntry> entries = taskIds.isEmpty() ? List.of()
				: timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(taskIds, TimeEntryStatus.APPROVED);

		Map<Long, Employee> employeesByUserId = employeeRepository.findByUser_IdIn(
				entries.stream().map(TimeEntry::getUserId).distinct().toList()).stream()
					.collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		BigDecimal totalBillableHours = BigDecimal.ZERO;
		BigDecimal totalRevenue = BigDecimal.ZERO;
		int excludedLineCount = 0;
		int missingRateEntryCount = 0;
		List<RevenueLineRes> lines = new ArrayList<>();

		for (TimeEntry entry : entries) {
			Employee employee = employeesByUserId.get(entry.getUserId());
			Long employeeId = employee == null ? null : employee.getId();
			boolean billable = Boolean.TRUE.equals(entry.getBillable());
			if (!billable) {
				// TC-03: dong khong tinh phi bi loai khoi doanh thu (van con trong gia von - NCL-09-CN-001).
				excludedLineCount++;
				lines.add(new RevenueLineRes(entry.getId(), employeeId, entry.getWorkDate(), entry.getHours(),
						null, BigDecimal.ZERO, false, false));
				continue;
			}

			totalBillableHours = totalBillableHours.add(entry.getHours());
			try {
				ResolvedRateRes resolved = rateResolutionService.resolveForTimeEntry(entry.getId());
				BigDecimal hourlyRate = resolved.appliedDailyRate()
						.divide(HOURS_PER_WORKDAY, 4, RoundingMode.HALF_UP);
				BigDecimal lineRevenue = entry.getHours().multiply(hourlyRate).setScale(2, RoundingMode.HALF_UP);
				totalRevenue = totalRevenue.add(lineRevenue);
				lines.add(new RevenueLineRes(entry.getId(), employeeId, entry.getWorkDate(), entry.getHours(),
						hourlyRate, lineRevenue, true, false));
			} catch (BusinessRuleException ex) {
				// Chua co don gia hieu luc, chua khai bao cap bac/vai tro... — danh dau thieu du lieu,
				// khong chan ca luot tinh doanh thu (cung cach LaborCostServiceImpl xu ly missingCostData).
				missingRateEntryCount++;
				lines.add(new RevenueLineRes(entry.getId(), employeeId, entry.getWorkDate(), entry.getHours(),
						null, BigDecimal.ZERO, true, true));
			}
		}

		return new RecognizedRevenueRes(project.getId(), contract.getId(), contract.getContractType(),
				RecognitionMethod.HOURLY, totalRevenue, totalBillableHours, excludedLineCount,
				missingRateEntryCount, null, null, null, lines);
	}

	/** FIXED_PRICE: gia tri hop dong nhan ty le hoan thanh cong viec (so task DONE / tong so task). */
	private RecognizedRevenueRes calculatePercentageOfCompletion(Project project, Contract contract) {
		List<Task> tasks = taskRepository.findByProjectIdOrderByIdAsc(project.getId());
		int totalTaskCount = tasks.size();
		int doneTaskCount = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

		BigDecimal completionRate = totalTaskCount == 0
				? BigDecimal.ZERO
				: BigDecimal.valueOf(doneTaskCount)
						.divide(BigDecimal.valueOf(totalTaskCount), 4, RoundingMode.HALF_UP);

		BigDecimal totalRevenue = contract.getTotalValue().multiply(completionRate)
				.setScale(2, RoundingMode.HALF_UP);

		return new RecognizedRevenueRes(project.getId(), contract.getId(), contract.getContractType(),
				RecognitionMethod.PERCENTAGE_OF_COMPLETION, totalRevenue, null, 0, 0,
				completionRate, totalTaskCount, doneTaskCount, List.of());
	}
}
