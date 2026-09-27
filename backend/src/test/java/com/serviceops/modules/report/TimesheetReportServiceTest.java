package com.serviceops.modules.report;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.report.dto.response.TimesheetByEmployeeRes;
import com.serviceops.modules.report.dto.response.TimesheetEmployeeProjectRow;
import com.serviceops.modules.report.repository.TimesheetQueryRepository;
import com.serviceops.modules.report.repository.TimesheetQueryRepository.TimesheetHourRow;
import com.serviceops.modules.report.service.impl.TimesheetReportServiceImpl;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** NCL-11-CN-006 — Báo cáo giờ công theo nhân sự. */
@ExtendWith(MockitoExtension.class)
class TimesheetReportServiceTest {

	private static final Long MANAGER_ID = 77L;
	private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
	private static final LocalDate TO = LocalDate.of(2026, 9, 30);

	@Mock private ProjectRepository projectRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private TimesheetQueryRepository timesheetQueryRepository;
	@Mock private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock private AuditLogService auditLogService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private TimesheetReportServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new TimesheetReportServiceImpl(projectRepository, employeeRepository, timesheetQueryRepository,
				currentUserScopeProvider, auditLogService, sensitiveAccessLogger);
	}

	/** TC-01: giờ công ĐÃ DUYỆT tách billable/non-billable theo từng cặp (nhân sự, dự án). */
	@Test
	void report_splitsBillableAndNonBillableHoursPerEmployeeAndProject() {
		Project project = project(500L, "DA-01");
		stubManagerProjects(project);
		Employee employee = employee(1L, 900L, "Nguyen Van A");
		when(timesheetQueryRepository.sumApprovedHoursByUserAndProject(List.of(500L), FROM, TO)).thenReturn(List.of(
				new TimesheetHourRow(900L, 500L, true, new BigDecimal("40.00")),
				new TimesheetHourRow(900L, 500L, false, new BigDecimal("5.00"))));
		when(employeeRepository.findByUser_IdIn(List.of(900L))).thenReturn(List.of(employee));

		TimesheetByEmployeeRes report = service.getReport(FROM, TO);

		assertThat(report.employeeCount()).isEqualTo(1);
		assertThat(report.projectCount()).isEqualTo(1);
		assertThat(report.totalBillableHours()).isEqualByComparingTo("40.00");
		assertThat(report.totalNonBillableHours()).isEqualByComparingTo("5.00");
		assertThat(report.totalHours()).isEqualByComparingTo("45.00");

		TimesheetEmployeeProjectRow row = report.rows().get(0);
		assertThat(row.employeeId()).isEqualTo(1L);
		assertThat(row.employeeName()).isEqualTo("Nguyen Van A");
		assertThat(row.projectId()).isEqualTo(500L);
		assertThat(row.projectCode()).isEqualTo("DA-01");
		assertThat(row.billableHours()).isEqualByComparingTo("40.00");
		assertThat(row.nonBillableHours()).isEqualByComparingTo("5.00");
		assertThat(row.totalHours()).isEqualByComparingTo("45.00");
	}

	/** QTN-01: chỉ lấy dự án do chính người xem quản lý. */
	@Test
	void report_scopesQueryToManagersOwnProjects() {
		Project project = project(500L, "DA-01");
		stubManagerProjects(project);
		when(timesheetQueryRepository.sumApprovedHoursByUserAndProject(List.of(500L), FROM, TO)).thenReturn(List.of());

		service.getReport(FROM, TO);

		verify(projectRepository).findByProjectManagerId(MANAGER_ID);
		verify(timesheetQueryRepository).sumApprovedHoursByUserAndProject(List.of(500L), FROM, TO);
	}

	/** Không có dự án nào do người xem quản lý: báo cáo rỗng, không gọi truy vấn giờ công. */
	@Test
	void report_returnsEmptyWhenManagerHasNoProjects() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(MANAGER_ID);
		when(projectRepository.findByProjectManagerId(MANAGER_ID)).thenReturn(List.of());

		TimesheetByEmployeeRes report = service.getReport(FROM, TO);

		assertThat(report.rows()).isEmpty();
		assertThat(report.totalHours()).isEqualByComparingTo("0");
		verifyNoInteractions(timesheetQueryRepository);
	}

	/** Tài khoản chưa có hồ sơ nhân sự: vẫn hiện dòng, tên để trống thay vì làm hỏng cả báo cáo. */
	@Test
	void report_keepsRowForUserWithoutEmployeeProfile() {
		Project project = project(500L, "DA-01");
		stubManagerProjects(project);
		when(timesheetQueryRepository.sumApprovedHoursByUserAndProject(List.of(500L), FROM, TO)).thenReturn(
				List.of(new TimesheetHourRow(901L, 500L, true, new BigDecimal("2.00"))));
		when(employeeRepository.findByUser_IdIn(List.of(901L))).thenReturn(List.of());

		TimesheetByEmployeeRes report = service.getReport(FROM, TO);

		TimesheetEmployeeProjectRow row = report.rows().get(0);
		assertThat(row.employeeId()).isNull();
		assertThat(row.employeeName()).isNull();
		assertThat(row.billableHours()).isEqualByComparingTo("2.00");
	}

	/** TC-03: mỗi lượt xem ghi Nhật ký hệ thống và nhật ký truy cập dữ liệu nhạy cảm. */
	@Test
	void report_recordsAuditAndSensitiveAccessLog() {
		stubManagerProjects();

		service.getReport(FROM, TO);

		verify(auditLogService).record(eq("Xem báo cáo giờ công theo nhân sự"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Báo cáo giờ công theo nhân sự"), anyString());
		verify(sensitiveAccessLogger).logView(eq(SensitiveDataType.REVENUE), isNull(), eq("TimesheetReport"),
				anyString());
	}

	@Test
	void report_rejectsInvalidPeriod() {
		assertThatThrownBy(() -> service.getReport(TO, FROM)).isInstanceOf(BusinessRuleException.class);
	}

	@Test
	void report_requiresAuthenticatedUser() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(null);

		assertThatThrownBy(() -> service.getReport(FROM, TO)).isInstanceOf(AccessDeniedException.class);
	}

	private void stubManagerProjects(Project... projects) {
		when(currentUserScopeProvider.currentUserId()).thenReturn(MANAGER_ID);
		when(projectRepository.findByProjectManagerId(MANAGER_ID)).thenReturn(List.of(projects));
	}

	private static Project project(Long id, String code) {
		Project project = new Project();
		project.setId(id);
		project.setProjectCode(code);
		project.setName("Du an " + code);
		project.setStatus(ProjectStatus.RUNNING);
		project.setProjectManagerId(MANAGER_ID);
		return project;
	}

	private static Employee employee(Long employeeId, Long userId, String fullName) {
		Employee employee = new Employee();
		employee.setId(employeeId);
		User user = new User();
		user.setId(userId);
		user.setFullName(fullName);
		employee.setUser(user);
		return employee;
	}
}
