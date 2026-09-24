package com.serviceops.modules.report.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.report.dto.request.TimesheetReportReq;
import com.serviceops.modules.report.dto.response.TimesheetByEmployeeRes;
import com.serviceops.modules.report.dto.response.TimesheetEmployeeProjectRow;
import com.serviceops.modules.report.repository.TimesheetQueryRepository;
import com.serviceops.modules.report.repository.TimesheetQueryRepository.TimesheetHourRow;
import com.serviceops.modules.report.service.TimesheetReportService;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-11-CN-006 — Báo cáo giờ công theo nhân sự.
 *
 * <p>Lưới người × dự án cho các dự án do người xem quản lý (QTN-01, giống {@code ProjectPerformanceReportServiceImpl}):
 * mỗi ô là tổng giờ công ĐÃ DUYỆT của một nhân sự trên một dự án trong kỳ, tách riêng giờ có tính phí và không tính
 * phí ({@link TimesheetQueryRepository#sumApprovedHoursByUserAndProject}). Không quy đổi theo tỷ lệ giờ chuẩn
 * ({@code StandardHoursCalculator}) — đó là phạm vi của NCL-11-CN-002, không phải story này.</p>
 */
@Service
@RequiredArgsConstructor
public class TimesheetReportServiceImpl implements TimesheetReportService {

	static final String REPORT_LABEL = "Báo cáo giờ công theo nhân sự";

	private final ProjectRepository projectRepository;
	private final EmployeeRepository employeeRepository;
	private final TimesheetQueryRepository timesheetQueryRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final AuditLogService auditLogService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	// Không readOnly: nhật ký xem dữ liệu nhạy cảm ghi cùng transaction (QTN-03, không ghi được thì không trả số liệu).
	@Override
	@Transactional
	public TimesheetByEmployeeRes getReport(LocalDate from, LocalDate to) {
		TimesheetReportReq period = TimesheetReportReq.requireValid(new TimesheetReportReq(from, to));
		Long managerId = requireCurrentUserId();

		List<Project> projects = projectRepository.findByProjectManagerId(managerId);
		Map<Long, Project> projectsById = projects.stream()
				.collect(Collectors.toMap(Project::getId, Function.identity()));

		List<TimesheetHourRow> hourRows = projectsById.isEmpty() ? List.of()
				: timesheetQueryRepository.sumApprovedHoursByUserAndProject(new ArrayList<>(projectsById.keySet()),
						period.from(), period.to());

		Map<Long, Employee> employeesByUserId = hourRows.isEmpty() ? Map.of()
				: employeeRepository.findByUser_IdIn(hourRows.stream().map(TimesheetHourRow::userId).distinct().toList())
						.stream().collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		List<TimesheetEmployeeProjectRow> rows = buildRows(hourRows, projectsById, employeesByUserId);

		BigDecimal totalBillable = sum(rows, TimesheetEmployeeProjectRow::billableHours);
		BigDecimal totalNonBillable = sum(rows, TimesheetEmployeeProjectRow::nonBillableHours);
		BigDecimal totalHours = totalBillable.add(totalNonBillable);
		int employeeCount = (int) rows.stream().map(TimesheetEmployeeProjectRow::employeeId).distinct().count();
		int projectCount = (int) rows.stream().map(TimesheetEmployeeProjectRow::projectId).distinct().count();

		String detail = "Xem báo cáo giờ công theo nhân sự từ " + period.from() + " đến " + period.to() + " của "
				+ projectCount + " dự án";
		auditLogService.record("Xem báo cáo giờ công theo nhân sự", AuditTargetType.GENERAL, null, REPORT_LABEL,
				detail);
		sensitiveAccessLogger.logView(SensitiveDataType.REVENUE, null, "TimesheetReport", detail);

		return new TimesheetByEmployeeRes(period.from(), period.to(), employeeCount, projectCount, totalBillable,
				totalNonBillable, totalHours, rows);
	}

	/** Gộp các dòng (userId, projectId, billable, hours) thành lưới (nhân sự, dự án) với hai cột giờ tách sẵn. */
	private List<TimesheetEmployeeProjectRow> buildRows(List<TimesheetHourRow> hourRows,
			Map<Long, Project> projectsById, Map<Long, Employee> employeesByUserId) {
		record Key(Long userId, Long projectId) {
		}
		Map<Key, BigDecimal[]> byKey = new HashMap<>();
		for (TimesheetHourRow hourRow : hourRows) {
			Key key = new Key(hourRow.userId(), hourRow.projectId());
			BigDecimal[] hours = byKey.computeIfAbsent(key, k -> new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO});
			if (Boolean.TRUE.equals(hourRow.billable())) {
				hours[0] = hours[0].add(hourRow.hours());
			} else {
				hours[1] = hours[1].add(hourRow.hours());
			}
		}

		List<TimesheetEmployeeProjectRow> rows = new ArrayList<>();
		for (Map.Entry<Key, BigDecimal[]> entry : byKey.entrySet()) {
			Long userId = entry.getKey().userId();
			Long projectId = entry.getKey().projectId();
			BigDecimal billable = entry.getValue()[0];
			BigDecimal nonBillable = entry.getValue()[1];
			Project project = projectsById.get(projectId);
			Employee employee = employeesByUserId.get(userId);
			// Tài khoản chưa có hồ sơ nhân sự: vẫn hiện dòng, tên để trống thay vì làm hỏng cả báo cáo.
			rows.add(new TimesheetEmployeeProjectRow(employee == null ? null : employee.getId(),
					employee == null ? null : employee.getUser().getFullName(), projectId,
					project == null ? null : project.getProjectCode(), project == null ? null : project.getName(),
					billable, nonBillable, billable.add(nonBillable)));
		}

		return rows.stream()
				.sorted(Comparator.comparing((TimesheetEmployeeProjectRow row) -> nullToEmpty(row.employeeName()),
						String.CASE_INSENSITIVE_ORDER)
						.thenComparing(row -> nullToEmpty(row.projectCode()), String.CASE_INSENSITIVE_ORDER))
				.toList();
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	private static BigDecimal sum(List<TimesheetEmployeeProjectRow> rows,
			Function<TimesheetEmployeeProjectRow, BigDecimal> extractor) {
		return rows.stream().map(extractor).reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private Long requireCurrentUserId() {
		Long userId = currentUserScopeProvider.currentUserId();
		if (userId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		return userId;
	}
}
