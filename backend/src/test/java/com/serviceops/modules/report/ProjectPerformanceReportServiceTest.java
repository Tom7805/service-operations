package com.serviceops.modules.report;

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
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.expense.repository.SubcontractorExpenseRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
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
import com.serviceops.modules.report.service.impl.ProjectPerformanceReportServiceImpl;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** NCL-11-CN-003 — Báo cáo hiệu quả theo dự án. */
@ExtendWith(MockitoExtension.class)
class ProjectPerformanceReportServiceTest {

	private static final Long MANAGER_ID = 77L;

	@Mock private ProjectRepository projectRepository;
	@Mock private ContractRepository contractRepository;
	@Mock private QuoteRepository quoteRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private ProjectExpenseRepository projectExpenseRepository;
	@Mock private SubcontractorExpenseRepository subcontractorExpenseRepository;
	@Mock private EntryMarginCalculator entryMarginCalculator;
	@Mock private QuotePlanEstimator quotePlanEstimator;
	@Mock private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock private AuditLogService auditLogService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private ProjectPerformanceReportServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ProjectPerformanceReportServiceImpl(projectRepository, contractRepository, quoteRepository,
				taskRepository, timeEntryRepository, employeeRepository, projectExpenseRepository,
				subcontractorExpenseRepository, entryMarginCalculator, quotePlanEstimator, currentUserScopeProvider,
				auditLogService, sensitiveAccessLogger);
	}

	/**
	 * TC-01: báo giá 800 giờ nhưng thực tế 950 giờ -> chênh 150 giờ (18,75%) và ảnh hưởng tới biên. Biên thực tế trừ cả
	 * chi phí dự án đã duyệt; giá trị hợp đồng đặt cạnh doanh thu ghi nhận theo giờ.
	 */
	@Test
	void report_comparesHoursRevenueAndMarginAgainstQuote() {
		Project project = project(1L, "DA-01", 500L, ProjectStatus.RUNNING);
		Contract contract = contract(500L, 7L, ContractType.TIME_AND_MATERIAL, "200000000.00");
		Quote quote = quote(7L, 2);
		Task task = task(10L, 1L, TaskStatus.IN_PROGRESS);
		TimeEntry entry = timeEntry(100L, 900L, 10L, "950.00", true);
		Employee employee = employee(5L, 900L);

		stubManagerProjects(project);
		when(contractRepository.findAllById(List.of(500L))).thenReturn(List.of(contract));
		when(quoteRepository.findAllById(List.of(7L))).thenReturn(List.of(quote));
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(10L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(entry));
		when(employeeRepository.findByUser_IdIn(List.of(900L))).thenReturn(List.of(employee));
		when(entryMarginCalculator.resolve(entry, employee, 500L)).thenReturn(new EntryMarginCalculator.Result(
				new BigDecimal("47500000.00"), false, new BigDecimal("95000000.00"), false));
		when(projectExpenseRepository.findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(1L, ExpenseStatus.APPROVED))
				.thenReturn(List.of(expense("2500000.00")));
		when(subcontractorExpenseRepository.findByProjectIdAndStatusOrderByIncurredPeriodAscIdAsc(1L,
				ExpenseStatus.APPROVED)).thenReturn(List.of());
		when(quotePlanEstimator.estimate(quote)).thenReturn(new QuotePlanEstimator.Plan(new BigDecimal("100.00"),
				new BigDecimal("800.00"), new BigDecimal("120000000.00"), new BigDecimal("60000000.00"), 0));

		ProjectPerformanceReportRes report = service.getReport(null);

		assertThat(report.projectCount()).isEqualTo(1);
		assertThat(report.projectsWithoutPlanCount()).isZero();
		assertThat(report.overPlannedHoursProjectCount()).isEqualTo(1);
		assertThat(report.belowPlannedMarginProjectCount()).isEqualTo(1);

		ProjectPerformanceRes row = report.projects().get(0);
		assertThat(row.planAvailable()).isTrue();
		assertThat(row.quoteVersion()).isEqualTo(2);
		assertThat(row.plannedHours()).isEqualByComparingTo("800");
		assertThat(row.actualHours()).isEqualByComparingTo("950");
		assertThat(row.hoursVariance()).isEqualByComparingTo("150");
		assertThat(row.hoursVariancePercent()).isEqualByComparingTo("18.75");

		assertThat(row.contractValue()).isEqualByComparingTo("200000000");
		assertThat(row.recognizedRevenue()).isEqualByComparingTo("95000000");
		assertThat(row.revenueRecognitionMethod()).isEqualTo(RecognitionMethod.HOURLY);
		assertThat(row.revenueToContractPercent()).isEqualByComparingTo("47.50");

		assertThat(row.actualCost()).isEqualByComparingTo("50000000");
		assertThat(row.plannedMarginPercent()).isEqualByComparingTo("50.00");
		assertThat(row.actualMarginPercent()).isEqualByComparingTo("47.37");
		assertThat(row.marginGapPercentPoints()).isEqualByComparingTo("-2.63");

		// 150 giờ vượt × 50.000đ/giờ nhân công bình quân = 7,5 triệu = 6,25 điểm biên trên doanh thu dự kiến 120 triệu.
		assertThat(row.hoursVarianceCostImpact()).isEqualByComparingTo("7500000");
		assertThat(row.hoursVarianceMarginImpactPercentPoints()).isEqualByComparingTo("-6.25");
		assertThat(row.warnings()).containsExactly(
				"Giờ công thực tế vượt kế hoạch 150.00 giờ (18.75%), làm biên lợi nhuận giảm 6.25 điểm phần trăm.");
	}

	/** TC-02: dự án chưa có báo giá vẫn hiện trong báo cáo, kèm cờ và cảnh báo thiếu dữ liệu kế hoạch. */
	@Test
	void report_flagsProjectWithoutQuoteInsteadOfFailing() {
		Project project = project(2L, "DA-02", 501L, ProjectStatus.RUNNING);
		Contract contract = contract(501L, null, ContractType.TIME_AND_MATERIAL, "50000000.00");

		stubManagerProjects(project);
		when(contractRepository.findAllById(List.of(501L))).thenReturn(List.of(contract));
		when(quoteRepository.findAllById(List.of())).thenReturn(List.of());
		when(taskRepository.findByProjectIdOrderByIdAsc(2L)).thenReturn(List.of());
		stubNoExpenses(2L);

		ProjectPerformanceReportRes report = service.getReport(null);

		assertThat(report.projectsWithoutPlanCount()).isEqualTo(1);
		ProjectPerformanceRes row = report.projects().get(0);
		assertThat(row.planAvailable()).isFalse();
		assertThat(row.quoteId()).isNull();
		assertThat(row.plannedHours()).isNull();
		assertThat(row.hoursVariance()).isNull();
		assertThat(row.plannedMarginPercent()).isNull();
		assertThat(row.marginGapPercentPoints()).isNull();
		assertThat(row.actualHours()).isEqualByComparingTo("0");
		assertThat(row.actualMarginPercent()).isNull();
		assertThat(row.warnings()).containsExactly("Dự án chưa có báo giá gắn kèm nên thiếu dữ liệu kế hoạch để so sánh.");
		verifyNoInteractions(quotePlanEstimator, timeEntryRepository);
	}

	/** Hợp đồng trọn gói: doanh thu ghi nhận = giá trị hợp đồng × tỷ lệ công việc hoàn thành (như NCL-09-CN-002). */
	@Test
	void report_recognizesFixedPriceRevenueByCompletion() {
		Project project = project(3L, "DA-03", 502L, ProjectStatus.RUNNING);
		Contract contract = contract(502L, null, ContractType.FIXED_PRICE, "100000000.00");

		stubManagerProjects(project);
		when(contractRepository.findAllById(List.of(502L))).thenReturn(List.of(contract));
		when(quoteRepository.findAllById(List.of())).thenReturn(List.of());
		when(taskRepository.findByProjectIdOrderByIdAsc(3L)).thenReturn(List.of(
				task(30L, 3L, TaskStatus.DONE), task(31L, 3L, TaskStatus.DONE),
				task(32L, 3L, TaskStatus.DONE), task(33L, 3L, TaskStatus.IN_PROGRESS)));
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(any(), eq(TimeEntryStatus.APPROVED)))
				.thenReturn(List.of());
		stubNoExpenses(3L);

		ProjectPerformanceRes row = service.getReport(null).projects().get(0);

		assertThat(row.revenueRecognitionMethod()).isEqualTo(RecognitionMethod.PERCENTAGE_OF_COMPLETION);
		assertThat(row.recognizedRevenue()).isEqualByComparingTo("75000000");
		assertThat(row.revenueToContractPercent()).isEqualByComparingTo("75.00");
		assertThat(row.actualMarginPercent()).isEqualByComparingTo("100.00");
	}

	/** QTN-01: chỉ lấy dự án của chính người xem, lọc trạng thái khi có; dự án đang chạy xếp trước dự án đã đóng. */
	@Test
	void report_filtersByStatusAndOnlyReadsCurrentManagersProjects() {
		Project running = project(4L, "DA-04", 503L, ProjectStatus.RUNNING);
		Project closed = project(5L, "DA-05", 504L, ProjectStatus.CLOSED);
		stubManagerProjects(running, closed);
		when(contractRepository.findAllById(List.of(504L)))
				.thenReturn(List.of(contract(504L, null, ContractType.TIME_AND_MATERIAL, "1.00")));
		when(quoteRepository.findAllById(List.of())).thenReturn(List.of());
		when(taskRepository.findByProjectIdOrderByIdAsc(5L)).thenReturn(List.of());
		stubNoExpenses(5L);

		ProjectPerformanceReportRes report = service.getReport(ProjectStatus.CLOSED);

		assertThat(report.status()).isEqualTo(ProjectStatus.CLOSED);
		assertThat(report.projects()).extracting(ProjectPerformanceRes::projectId).containsExactly(5L);
		verify(projectRepository).findByProjectManagerId(MANAGER_ID);
		verify(taskRepository, never()).findByProjectIdOrderByIdAsc(4L);
	}

	/** TC-04: mỗi lượt xem ghi Nhật ký hệ thống và nhật ký truy cập dữ liệu nhạy cảm (biên lợi nhuận). */
	@Test
	void report_recordsAuditAndSensitiveAccessLog() {
		stubManagerProjects();

		ProjectPerformanceReportRes report = service.getReport(null);

		assertThat(report.projects()).isEmpty();
		verify(auditLogService).record(eq("Xem báo cáo hiệu quả theo dự án"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Báo cáo hiệu quả theo dự án"), anyString());
		verify(sensitiveAccessLogger).logView(eq(SensitiveDataType.MARGIN), isNull(), eq("ProjectPerformanceReport"),
				anyString());
	}

	/** QTN-01: mở trực tiếp dự án của quản lý khác bị từ chối và không trả số liệu. */
	@Test
	void projectReport_deniesProjectManagedBySomeoneElse() {
		Project others = project(6L, "DA-06", 505L, ProjectStatus.RUNNING);
		others.setProjectManagerId(999L);
		when(currentUserScopeProvider.currentUserId()).thenReturn(MANAGER_ID);
		when(projectRepository.findById(6L)).thenReturn(Optional.of(others));

		assertThatThrownBy(() -> service.getProjectReport(6L)).isInstanceOf(AccessDeniedException.class);
		verifyNoInteractions(contractRepository, auditLogService, sensitiveAccessLogger);
	}

	@Test
	void projectReport_returnsNotFoundForUnknownProject() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(MANAGER_ID);
		when(projectRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.getProjectReport(404L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	void projectReport_returnsRowForOwnProjectAndLogsItsId() {
		Project project = project(7L, "DA-07", 506L, ProjectStatus.RUNNING);
		when(currentUserScopeProvider.currentUserId()).thenReturn(MANAGER_ID);
		when(projectRepository.findById(7L)).thenReturn(Optional.of(project));
		when(contractRepository.findAllById(List.of(506L)))
				.thenReturn(List.of(contract(506L, null, ContractType.TIME_AND_MATERIAL, "10.00")));
		when(quoteRepository.findAllById(List.of())).thenReturn(List.of());
		when(taskRepository.findByProjectIdOrderByIdAsc(7L)).thenReturn(List.of());
		stubNoExpenses(7L);

		ProjectPerformanceRes row = service.getProjectReport(7L);

		assertThat(row.projectCode()).isEqualTo("DA-07");
		verify(auditLogService).record(anyString(), eq(AuditTargetType.GENERAL), eq(7L), anyString(), anyString());
		verify(sensitiveAccessLogger).logView(eq(SensitiveDataType.MARGIN), eq(7L), anyString(), anyString());
	}

	/** Tài khoản chưa có hồ sơ nhân sự: vẫn cộng giờ, đếm là thiếu đơn giá thay vì làm hỏng cả báo cáo. */
	@Test
	void report_countsEntriesWithoutEmployeeProfileAsMissingRates() {
		Project project = project(8L, "DA-08", 507L, ProjectStatus.RUNNING);
		TimeEntry entry = timeEntry(800L, 901L, 80L, "4.00", true);
		stubManagerProjects(project);
		when(contractRepository.findAllById(List.of(507L)))
				.thenReturn(List.of(contract(507L, null, ContractType.TIME_AND_MATERIAL, "10.00")));
		when(quoteRepository.findAllById(List.of())).thenReturn(List.of());
		when(taskRepository.findByProjectIdOrderByIdAsc(8L)).thenReturn(List.of(task(80L, 8L, TaskStatus.TODO)));
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(80L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(entry));
		when(employeeRepository.findByUser_IdIn(List.of(901L))).thenReturn(List.of());
		stubNoExpenses(8L);

		ProjectPerformanceRes row = service.getReport(null).projects().get(0);

		assertThat(row.actualHours()).isEqualByComparingTo("4");
		assertThat(row.missingActualCostEntryCount()).isEqualTo(1);
		assertThat(row.missingActualRevenueEntryCount()).isEqualTo(1);
		verify(entryMarginCalculator, never()).resolve(any(), any(), anyLong());
	}

	private void stubManagerProjects(Project... projects) {
		when(currentUserScopeProvider.currentUserId()).thenReturn(MANAGER_ID);
		when(projectRepository.findByProjectManagerId(MANAGER_ID)).thenReturn(List.of(projects));
	}

	private void stubNoExpenses(Long projectId) {
		when(projectExpenseRepository.findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(projectId,
				ExpenseStatus.APPROVED)).thenReturn(List.of());
		when(subcontractorExpenseRepository.findByProjectIdAndStatusOrderByIncurredPeriodAscIdAsc(projectId,
				ExpenseStatus.APPROVED)).thenReturn(List.of());
	}

	private static Project project(Long id, String code, Long contractId, ProjectStatus status) {
		Project project = new Project();
		project.setId(id);
		project.setProjectCode(code);
		project.setName("Du an " + code);
		project.setContractId(contractId);
		project.setCustomerId(1L);
		project.setStatus(status);
		project.setProjectManagerId(MANAGER_ID);
		return project;
	}

	private static Contract contract(Long id, Long quoteId, ContractType type, String totalValue) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractCode("HD-" + id);
		contract.setQuoteId(quoteId);
		contract.setContractType(type);
		contract.setTotalValue(new BigDecimal(totalValue));
		return contract;
	}

	private static Quote quote(Long id, int version) {
		Quote quote = new Quote();
		quote.setId(id);
		quote.setVersion(version);
		return quote;
	}

	private static Task task(Long id, Long projectId, TaskStatus status) {
		Task task = new Task();
		task.setId(id);
		task.setProjectId(projectId);
		task.setStatus(status);
		return task;
	}

	private static Employee employee(Long employeeId, Long userId) {
		Employee employee = new Employee();
		employee.setId(employeeId);
		User user = new User();
		user.setId(userId);
		employee.setUser(user);
		return employee;
	}

	private static TimeEntry timeEntry(Long id, Long userId, Long taskId, String hours, boolean billable) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setUserId(userId);
		entry.setTaskId(taskId);
		entry.setHours(new BigDecimal(hours));
		entry.setBillable(billable);
		entry.setWorkDate(LocalDate.of(2026, 2, 1));
		entry.setStatus(TimeEntryStatus.APPROVED);
		return entry;
	}

	private static ProjectExpense expense(String amount) {
		ProjectExpense expense = new ProjectExpense();
		expense.setAmount(new BigDecimal(amount));
		return expense;
	}
}
