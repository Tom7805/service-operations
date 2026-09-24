package com.serviceops.modules.report.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.entity.SubcontractorExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.expense.repository.SubcontractorExpenseRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.impl.EntryMarginCalculator;
import com.serviceops.modules.profitability.service.impl.QuotePlanEstimator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.repository.QuoteRepository;
import com.serviceops.modules.report.dto.response.ProjectPerformanceReportRes;
import com.serviceops.modules.report.dto.response.ProjectPerformanceRes;
import com.serviceops.modules.report.service.ProjectPerformanceReportService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-11-CN-003 — Báo cáo hiệu quả theo dự án.
 *
 * <p>Với mỗi dự án do người xem quản lý (QTN-01), so kế hoạch trong báo giá gắn với hợp đồng
 * ({@link QuotePlanEstimator}, cùng nguồn với NCL-09-CN-006) với thực tế tính đến hiện tại:</p>
 * <ul>
 *   <li><b>Giờ công</b>: giờ dự kiến = số ngày công báo giá × 8; giờ thực tế = mọi dòng giờ công ĐÃ DUYỆT (cả tính phí
 *   lẫn không tính phí; dòng đảo/sửa mang dấu nên cộng thẳng).</li>
 *   <li><b>Giá trị hợp đồng với doanh thu ghi nhận</b>: cách ghi nhận như NCL-09-CN-002 — hợp đồng trọn gói theo tỷ lệ
 *   công việc hoàn thành, các loại còn lại theo giờ công tính phí đã duyệt × đơn giá áp dụng
 *   ({@link EntryMarginCalculator}).</li>
 *   <li><b>Biên</b>: biên dự kiến từ báo giá (giá vốn nhân công ước tính); biên thực tế trừ đủ giá vốn nhân công, chi phí
 *   dự án và chi phí thuê ngoài đã duyệt như NCL-09-CN-003.</li>
 * </ul>
 * <p>Dự án thiếu báo giá vẫn hiện trong báo cáo, kèm cờ thiếu kế hoạch (TC-02) thay vì làm hỏng cả báo cáo.</p>
 */
@Service
@RequiredArgsConstructor
public class ProjectPerformanceReportServiceImpl implements ProjectPerformanceReportService {

	static final String REPORT_LABEL = "Báo cáo hiệu quả theo dự án";
	private static final BigDecimal HUNDRED = new BigDecimal("100");
	private final ProjectRepository projectRepository;
	private final ContractRepository contractRepository;
	private final QuoteRepository quoteRepository;
	private final TaskRepository taskRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final EmployeeRepository employeeRepository;
	private final ProjectExpenseRepository projectExpenseRepository;
	private final SubcontractorExpenseRepository subcontractorExpenseRepository;
	private final EntryMarginCalculator entryMarginCalculator;
	private final QuotePlanEstimator quotePlanEstimator;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final AuditLogService auditLogService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	// Không readOnly: nhật ký xem dữ liệu nhạy cảm ghi cùng transaction (QTN-03, không ghi được thì không trả số liệu).
	@Override
	@Transactional
	public ProjectPerformanceReportRes getReport(ProjectStatus status) {
		Long managerId = requireCurrentUserId();
		List<Project> projects = projectRepository.findByProjectManagerId(managerId).stream()
				.filter(project -> status == null || project.getStatus() == status)
				.toList();

		List<ProjectPerformanceRes> rows = sorted(buildRows(projects));

		int withoutPlan = (int) rows.stream().filter(row -> !row.planAvailable()).count();
		int overHours = (int) rows.stream()
				.filter(row -> row.hoursVariance() != null && row.hoursVariance().signum() > 0).count();
		int belowMargin = (int) rows.stream()
				.filter(row -> row.marginGapPercentPoints() != null && row.marginGapPercentPoints().signum() < 0).count();

		String detail = "Xem báo cáo hiệu quả của " + rows.size() + " dự án"
				+ (status == null ? "" : " trạng thái " + status);
		auditLogService.record("Xem báo cáo hiệu quả theo dự án", AuditTargetType.GENERAL, null, REPORT_LABEL, detail);
		sensitiveAccessLogger.logView(SensitiveDataType.MARGIN, null, "ProjectPerformanceReport", detail);

		return new ProjectPerformanceReportRes(status, rows.size(), withoutPlan, overHours, belowMargin, rows);
	}

	@Override
	@Transactional
	public ProjectPerformanceRes getProjectReport(Long projectId) {
		Long managerId = requireCurrentUserId();
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + projectId));
		// QTN-01: chỉ xem dự án mình phụ trách; GlobalExceptionHandler trả 403 và ghi nhật ký lần từ chối.
		if (!managerId.equals(project.getProjectManagerId())) {
			throw new AccessDeniedException("Du an khong thuoc pham vi quan ly cua nguoi dung");
		}

		ProjectPerformanceRes row = buildRows(List.of(project)).get(0);

		String detail = "Xem báo cáo hiệu quả của dự án " + project.getProjectCode();
		auditLogService.record("Xem báo cáo hiệu quả theo dự án", AuditTargetType.GENERAL, projectId, REPORT_LABEL,
				detail);
		sensitiveAccessLogger.logView(SensitiveDataType.MARGIN, projectId, "ProjectPerformanceReport", detail);
		return row;
	}

	@Override
	@Transactional(readOnly = true)
	public List<ProjectPerformanceRes> getRowsForPeriod(LocalDate from, LocalDate to) {
		Long managerId = requireCurrentUserId();
		List<Project> projects = projectRepository.findByProjectManagerId(managerId).stream()
				.filter(project -> activeInPeriod(project, from, to))
				.toList();
		return sorted(buildRows(projects));
	}

	/** Dự án hoạt động trong kỳ khi khoảng [startDate, expectedEndDate] giao với [from, to]; thiếu đầu nào coi là mở. */
	private static boolean activeInPeriod(Project project, LocalDate from, LocalDate to) {
		boolean startedBeforeEnd = project.getStartDate() == null || !project.getStartDate().isAfter(to);
		boolean endsAfterStart = project.getExpectedEndDate() == null || !project.getExpectedEndDate().isBefore(from);
		return startedBeforeEnd && endsAfterStart;
	}

	/** Dự án RUNNING trước CLOSED, sau đó theo mã dự án. */
	private static List<ProjectPerformanceRes> sorted(List<ProjectPerformanceRes> rows) {
		return rows.stream()
				.sorted(Comparator.comparing((ProjectPerformanceRes row) -> row.status() != ProjectStatus.RUNNING)
						.thenComparing(ProjectPerformanceRes::projectCode, String.CASE_INSENSITIVE_ORDER))
				.toList();
	}

	private List<ProjectPerformanceRes> buildRows(List<Project> projects) {
		if (projects.isEmpty()) {
			return List.of();
		}

		Map<Long, Contract> contractsById = contractRepository
				.findAllById(projects.stream().map(Project::getContractId).distinct().toList()).stream()
				.collect(Collectors.toMap(Contract::getId, Function.identity()));

		Map<Long, Quote> quotesById = quoteRepository
				.findAllById(contractsById.values().stream().map(Contract::getQuoteId).filter(Objects::nonNull)
						.distinct().toList()).stream()
				.collect(Collectors.toMap(Quote::getId, Function.identity()));

		Map<Long, List<Task>> tasksByProject = projects.stream().collect(Collectors.toMap(Project::getId,
				project -> taskRepository.findByProjectIdOrderByIdAsc(project.getId())));
		Map<Long, Long> projectIdByTaskId = tasksByProject.values().stream().flatMap(List::stream)
				.collect(Collectors.toMap(Task::getId, Task::getProjectId));

		List<TimeEntry> entries = projectIdByTaskId.isEmpty() ? List.of()
				: timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(
						new ArrayList<>(projectIdByTaskId.keySet()), TimeEntryStatus.APPROVED);
		Map<Long, List<TimeEntry>> entriesByProject = entries.stream()
				.collect(Collectors.groupingBy(entry -> projectIdByTaskId.get(entry.getTaskId())));

		Map<Long, Employee> employeesByUserId = entries.isEmpty() ? Map.of()
				: employeeRepository.findByUser_IdIn(entries.stream().map(TimeEntry::getUserId).distinct().toList())
						.stream()
						.collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		List<ProjectPerformanceRes> rows = new ArrayList<>();
		for (Project project : projects) {
			Contract contract = contractsById.get(project.getContractId());
			if (contract == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi ID: " + project.getContractId());
			}
			Quote quote = contract.getQuoteId() == null ? null : quotesById.get(contract.getQuoteId());
			rows.add(buildRow(project, contract, quote, tasksByProject.get(project.getId()),
					entriesByProject.getOrDefault(project.getId(), List.of()), employeesByUserId));
		}
		return rows;
	}

	private ProjectPerformanceRes buildRow(Project project, Contract contract, Quote quote, List<Task> tasks,
										   List<TimeEntry> entries, Map<Long, Employee> employeesByUserId) {
		List<String> warnings = new ArrayList<>();
		Actual actual = computeActual(project, contract, tasks, entries, employeesByUserId, warnings);

		BigDecimal contractValue = contract.getTotalValue() == null ? BigDecimal.ZERO : contract.getTotalValue();
		BigDecimal actualMarginPercent = percent(actual.revenue().subtract(actual.totalCost()), actual.revenue());

		BigDecimal plannedHours = null;
		BigDecimal hoursVariance = null;
		BigDecimal hoursVariancePercent = null;
		BigDecimal plannedRevenue = null;
		BigDecimal plannedCost = null;
		BigDecimal plannedMarginPercent = null;
		BigDecimal marginGap = null;
		BigDecimal costImpact = null;
		BigDecimal marginImpact = null;
		int missingPlannedCost = 0;

		if (quote == null) {
			// TC-02: không có báo giá nào gắn kèm -> không có dữ liệu kế hoạch để so sánh.
			warnings.add(0, "Dự án chưa có báo giá gắn kèm nên thiếu dữ liệu kế hoạch để so sánh.");
		} else {
			QuotePlanEstimator.Plan plan = quotePlanEstimator.estimate(quote);
			plannedHours = plan.hours();
			hoursVariance = actual.hours().subtract(plannedHours);
			hoursVariancePercent = percent(hoursVariance, plannedHours);
			plannedRevenue = plan.revenue();
			plannedCost = plan.cost();
			plannedMarginPercent = percent(plan.margin(), plan.revenue());
			marginGap = (plannedMarginPercent == null || actualMarginPercent == null) ? null
					: actualMarginPercent.subtract(plannedMarginPercent);
			missingPlannedCost = plan.missingCostItemCount();

			BigDecimal hourlyLaborCost = actual.costedHours().signum() == 0 ? null
					: actual.laborCost().divide(actual.costedHours(), 4, RoundingMode.HALF_UP);
			if (hourlyLaborCost != null) {
				costImpact = hoursVariance.multiply(hourlyLaborCost).setScale(2, RoundingMode.HALF_UP);
				marginImpact = percent(costImpact.negate(), plannedRevenue);
			}

			// TC-01: diễn giải chênh lệch giờ và ảnh hưởng của nó tới biên (theo điểm %, không lộ giá vốn).
			if (hoursVariance.signum() != 0) {
				StringBuilder message = new StringBuilder("Giờ công thực tế ")
						.append(hoursVariance.signum() > 0 ? "vượt" : "thấp hơn").append(" kế hoạch ")
						.append(hoursVariance.abs().setScale(2, RoundingMode.HALF_UP).toPlainString()).append(" giờ");
				if (hoursVariancePercent != null) {
					message.append(" (").append(hoursVariancePercent.abs().toPlainString()).append("%)");
				}
				if (marginImpact != null && marginImpact.signum() != 0) {
					message.append(", làm biên lợi nhuận ").append(marginImpact.signum() < 0 ? "giảm " : "tăng ")
							.append(marginImpact.abs().toPlainString()).append(" điểm phần trăm");
				}
				warnings.add(message.append('.').toString());
			}
			if (missingPlannedCost > 0) {
				warnings.add(missingPlannedCost + " dòng báo giá chưa ước tính được chi phí dự kiến vì chưa có nhân sự"
						+ " nào giữ vai trò đó.");
			}
		}

		if (actual.missingCost() > 0) {
			warnings.add(actual.missingCost() + " dòng giờ công đã duyệt thiếu đơn giá vốn nên giá vốn thực tế thấp"
					+ " hơn thực tế.");
		}
		if (actual.missingRevenue() > 0) {
			warnings.add(actual.missingRevenue() + " dòng giờ công tính phí đã duyệt thiếu đơn giá bán nên doanh thu"
					+ " ghi nhận thấp hơn thực tế.");
		}

		return new ProjectPerformanceRes(project.getId(), project.getProjectCode(), project.getName(),
				project.getStatus(), project.getCustomerId(), contract.getId(), contract.getContractCode(),
				contract.getContractType(),
				quote != null, quote == null ? null : quote.getId(), quote == null ? null : quote.getVersion(),
				plannedHours, actual.hours(), hoursVariance, hoursVariancePercent,
				contractValue, actual.revenue(), actual.recognitionMethod(), percent(actual.revenue(), contractValue),
				plannedRevenue, plannedCost, actual.totalCost(), plannedMarginPercent, actualMarginPercent, marginGap,
				costImpact, marginImpact,
				missingPlannedCost, actual.missingCost(), actual.missingRevenue(), warnings);
	}

	private Actual computeActual(Project project, Contract contract, List<Task> tasks, List<TimeEntry> entries,
								 Map<Long, Employee> employeesByUserId, List<String> warnings) {
		BigDecimal hours = BigDecimal.ZERO;
		BigDecimal costedHours = BigDecimal.ZERO;
		BigDecimal laborCost = BigDecimal.ZERO;
		BigDecimal hourlyRevenue = BigDecimal.ZERO;
		int missingCost = 0;
		int missingRevenue = 0;

		for (TimeEntry entry : entries) {
			hours = hours.add(entry.getHours());
			Employee employee = employeesByUserId.get(entry.getUserId());
			if (employee == null) {
				// Tài khoản chưa có hồ sơ nhân sự: không tra được đơn giá nào, không làm hỏng cả báo cáo.
				missingCost++;
				if (Boolean.TRUE.equals(entry.getBillable())) {
					missingRevenue++;
				}
				continue;
			}
			EntryMarginCalculator.Result resolved = entryMarginCalculator.resolve(entry, employee, contract.getId());
			laborCost = laborCost.add(resolved.cost());
			hourlyRevenue = hourlyRevenue.add(resolved.revenue());
			if (resolved.missingCost()) {
				missingCost++;
			} else {
				costedHours = costedHours.add(entry.getHours());
			}
			if (resolved.missingRevenue()) {
				missingRevenue++;
			}
		}

		RecognitionMethod method;
		BigDecimal revenue;
		if (contract.getContractType() == ContractType.FIXED_PRICE) {
			method = RecognitionMethod.PERCENTAGE_OF_COMPLETION;
			long done = tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();
			BigDecimal completion = tasks.isEmpty() ? BigDecimal.ZERO
					: BigDecimal.valueOf(done).divide(BigDecimal.valueOf(tasks.size()), 4, RoundingMode.HALF_UP);
			BigDecimal value = contract.getTotalValue() == null ? BigDecimal.ZERO : contract.getTotalValue();
			revenue = value.multiply(completion).setScale(2, RoundingMode.HALF_UP);
			// Trọn gói không ghi nhận theo đơn giá bán: thiếu đơn giá bán không ảnh hưởng doanh thu.
			missingRevenue = 0;
		} else {
			method = RecognitionMethod.HOURLY;
			revenue = hourlyRevenue;
			if (contract.getContractType() != ContractType.TIME_AND_MATERIAL) {
				warnings.add("Hợp đồng loại " + contract.getContractType() + " chưa có cách ghi nhận doanh thu riêng,"
						+ " tạm tính theo giờ công tính phí đã duyệt.");
			}
		}

		BigDecimal expenseCost = projectExpenseRepository
				.findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(project.getId(), ExpenseStatus.APPROVED).stream()
				.map(ProjectExpense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal subcontractorCost = subcontractorExpenseRepository
				.findByProjectIdAndStatusOrderByIncurredPeriodAscIdAsc(project.getId(), ExpenseStatus.APPROVED).stream()
				.map(SubcontractorExpense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal totalCost = laborCost.add(expenseCost).add(subcontractorCost).setScale(2, RoundingMode.HALF_UP);

		return new Actual(hours, costedHours, laborCost, totalCost, revenue, method, missingCost, missingRevenue);
	}

	/** Phần trăm 2 chữ số; null khi mẫu số bằng 0 thay vì chia cho 0. */
	private static BigDecimal percent(BigDecimal numerator, BigDecimal denominator) {
		if (denominator == null || denominator.signum() == 0) {
			return null;
		}
		return numerator.multiply(HUNDRED).divide(denominator, 2, RoundingMode.HALF_UP);
	}

	private Long requireCurrentUserId() {
		Long userId = currentUserScopeProvider.currentUserId();
		if (userId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		return userId;
	}

	private record Actual(BigDecimal hours, BigDecimal costedHours, BigDecimal laborCost, BigDecimal totalCost,
						  BigDecimal revenue, RecognitionMethod recognitionMethod, int missingCost,
						  int missingRevenue) {
	}
}
