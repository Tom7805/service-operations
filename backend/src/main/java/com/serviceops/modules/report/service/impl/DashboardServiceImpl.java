package com.serviceops.modules.report.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import com.serviceops.modules.identity.employee.service.HolidayService;
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.profitability.service.impl.EntryMarginCalculator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.DashboardKpiRes;
import com.serviceops.modules.report.dto.response.DashboardSummaryRes;
import com.serviceops.modules.report.repository.DashboardQueryRepository;
import com.serviceops.modules.report.service.DashboardService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-11-CN-001 — Bảng điều khiển vận hành.
 *
 * <p>Doanh thu và giá vốn của kỳ gộp từ giờ công ĐÃ DUYỆT qua {@link EntryMarginCalculator} — cùng nguồn với
 * báo cáo biên theo khách hàng/nhân sự (NCL-09-CN-005) nên hai nơi không lệch số. Giá vốn chỉ gồm nhân công;
 * chi phí dự án/thuê ngoài chưa tính vào biên của bảng điều khiển. Tỷ lệ giờ tính phí chia cho giờ chuẩn của
 * nhân sự trong kỳ (QTN-23, {@link StandardHoursCalculator}), không chia cho tổng giờ đã ghi.</p>
 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

	private final TimeEntryRepository timeEntryRepository;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final EmployeeRepository employeeRepository;
	private final EntryMarginCalculator entryMarginCalculator;
	private final DashboardQueryRepository dashboardQueryRepository;
	private final StandardHoursCalculator standardHoursCalculator;
	private final HolidayService holidayService;
	private final InvoiceService invoiceService;
	private final AuditLogService auditLogService;
	private final SensitiveAccessLogger sensitiveAccessLogger;
	private final Clock clock;

	// Không readOnly: nhật ký xem dữ liệu nhạy cảm ghi cùng transaction (QTN-03, không ghi được thì không trả số liệu).
	@Override
	@Transactional
	public DashboardSummaryRes getSummary(ReportPeriodReq period) {
		ReportPeriodReq validPeriod = ReportPeriodReq.requireValid(period);
		LocalDate from = validPeriod.from();
		LocalDate to = validPeriod.to();

		ProfitTotals profit = computeProfit(from, to);
		BigDecimal billableHours = dashboardQueryRepository.sumApprovedBillableHours(from, to);
		HolidayCalendar holidays = holidayService.calendarFor(from, to);
		BigDecimal standardHours = dashboardQueryRepository.findEmployeesEmployedBetween(from, to).stream()
				.map(employee -> standardHoursCalculator.standardHours(employee, from, to, holidays))
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		// Quá hạn tính tại cuối kỳ nhưng không vượt hôm nay: kỳ tương lai không có hóa đơn nào "đã quá hạn" sau hôm nay.
		LocalDate today = LocalDate.now(clock);
		LocalDate asOf = to.isBefore(today) ? to : today;
		int overdueInvoiceCount = invoiceService.listOverdue(asOf, null).size();

		DashboardKpiRes kpis = new DashboardKpiRes(
				profit.revenue(),
				ratio(profit.revenue().subtract(profit.cost()), profit.revenue()),
				ratio(billableHours, standardHours),
				profit.negativeMarginProjectCount(),
				overdueInvoiceCount);

		String detail = "Xem bảng điều khiển vận hành kỳ " + from + " - " + to;
		auditLogService.record("Xem bảng điều khiển vận hành", AuditTargetType.GENERAL, null,
				"Bảng điều khiển vận hành", detail);
		sensitiveAccessLogger.logView(SensitiveDataType.MARGIN, null, "OperationalDashboard", detail);

		return new DashboardSummaryRes(from, to, kpis, profit.missingCostEntryCount(), profit.missingRevenueEntryCount());
	}

	private ProfitTotals computeProfit(LocalDate from, LocalDate to) {
		List<TimeEntry> entries = timeEntryRepository
				.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, from, to);
		if (entries.isEmpty()) {
			return new ProfitTotals(BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, 0);
		}

		Map<Long, Task> tasksById = taskRepository
				.findAllById(entries.stream().map(TimeEntry::getTaskId).distinct().toList()).stream()
				.collect(Collectors.toMap(Task::getId, Function.identity()));

		Map<Long, Project> projectsById = projectRepository
				.findAllById(tasksById.values().stream().map(Task::getProjectId).distinct().toList()).stream()
				.collect(Collectors.toMap(Project::getId, Function.identity()));

		Map<Long, Employee> employeesByUserId = employeeRepository
				.findByUser_IdIn(entries.stream().map(TimeEntry::getUserId).distinct().toList()).stream()
				.collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		BigDecimal revenue = BigDecimal.ZERO;
		BigDecimal cost = BigDecimal.ZERO;
		int missingCost = 0;
		int missingRevenue = 0;
		Map<Long, BigDecimal> marginByProject = new HashMap<>();

		for (TimeEntry entry : entries) {
			Task task = tasksById.get(entry.getTaskId());
			if (task == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay cong viec voi ID: " + entry.getTaskId());
			}
			Project project = projectsById.get(task.getProjectId());
			if (project == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + task.getProjectId());
			}
			Employee employee = employeesByUserId.get(entry.getUserId());
			if (employee == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so nhan su cua dong gio cong voi ID: " + entry.getId());
			}

			EntryMarginCalculator.Result resolved = entryMarginCalculator.resolve(entry, employee, project.getContractId());
			revenue = revenue.add(resolved.revenue());
			cost = cost.add(resolved.cost());
			if (resolved.missingCost()) {
				missingCost++;
			}
			if (resolved.missingRevenue()) {
				missingRevenue++;
			}
			marginByProject.merge(project.getId(), resolved.revenue().subtract(resolved.cost()), BigDecimal::add);
		}

		int negativeProjects = (int) marginByProject.values().stream().filter(margin -> margin.signum() < 0).count();
		return new ProfitTotals(revenue, cost, negativeProjects, missingCost, missingRevenue);
	}

	/** 0 khi mẫu số bằng 0 (kỳ không có dữ liệu) thay vì chia cho 0. */
	private static BigDecimal ratio(BigDecimal numerator, BigDecimal denominator) {
		if (denominator.signum() == 0) {
			return BigDecimal.ZERO.setScale(4);
		}
		return numerator.divide(denominator, 4, RoundingMode.HALF_UP);
	}

	private record ProfitTotals(BigDecimal revenue, BigDecimal cost, int negativeMarginProjectCount,
								int missingCostEntryCount, int missingRevenueEntryCount) {
	}
}
