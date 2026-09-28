package com.serviceops.modules.report;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.entity.Holiday;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import com.serviceops.modules.identity.employee.service.HolidayService;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.profitability.service.impl.EntryMarginCalculator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.ContractBillRateService;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import com.serviceops.modules.rate.service.WorkTypeRateService;
import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.DashboardSummaryRes;
import com.serviceops.modules.report.repository.DashboardQueryRepository;
import com.serviceops.modules.report.service.impl.DashboardServiceImpl;
import com.serviceops.modules.report.service.impl.StandardHoursCalculator;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.WorkType;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * NCL-11-CN-001 — bảng điều khiển vận hành: số học của 5 chỉ số, kỳ rỗng, kỳ sai và nhật ký (TC-01, TC-02, TC-04).
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

	private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
	private static final LocalDate TO = LocalDate.of(2026, 1, 31);
	private static final LocalDate TODAY = LocalDate.of(2026, 2, 15);

	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private ProjectRepository projectRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private EmployeeHourlyRateService employeeHourlyRateService;
	@Mock private ContractBillRateService contractBillRateService;
	@Mock private WorkTypeRateService workTypeRateService;
	@Mock private DashboardQueryRepository dashboardQueryRepository;
	@Mock private HolidayService holidayService;
	@Mock private InvoiceService invoiceService;
	@Mock private AuditLogService auditLogService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private DashboardServiceImpl service;

	@BeforeEach
	void setUp() {
		EntryMarginCalculator calculator = new EntryMarginCalculator(
				employeeHourlyRateService, contractBillRateService, workTypeRateService);
		Clock clock = Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
		service = new DashboardServiceImpl(timeEntryRepository, taskRepository, projectRepository, employeeRepository,
				calculator, dashboardQueryRepository, new StandardHoursCalculator(), holidayService, invoiceService,
				auditLogService, sensitiveAccessLogger, clock);
		lenient().when(holidayService.calendarFor(any(), any())).thenReturn(HolidayCalendar.none());
	}

	/** Ngày lễ không tính giờ chuẩn: 1/1/2026 là thứ Năm nên tháng 1 còn 21 ngày = 168 giờ, 84 giờ tính phí -> 0.5. */
	@Test
	void excludesHolidaysFromStandardHoursOfBillableRatio() {
		Holiday newYear = new Holiday();
		newYear.setName("Tet duong lich");
		newYear.setHolidayDate(FROM);
		newYear.setRecurringYearly(true);
		when(holidayService.calendarFor(FROM, TO)).thenReturn(HolidayCalendar.of(List.of(newYear), FROM, TO));
		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of());
		when(dashboardQueryRepository.sumApprovedBillableHours(FROM, TO)).thenReturn(new BigDecimal("84.00"));
		when(dashboardQueryRepository.findEmployeesEmployedBetween(FROM, TO))
				.thenReturn(List.of(staff("40.00", LocalDate.of(2025, 1, 1), null)));
		when(invoiceService.listOverdue(TO, null)).thenReturn(List.of());

		DashboardSummaryRes result = service.getSummary(new ReportPeriodReq(FROM, TO));

		assertThat(result.kpis().billableHoursRatio()).isEqualByComparingTo("0.5000");
	}

	/** TC-01: dự án A lãi, dự án B (giờ không tính phí) âm biên; đủ 5 chỉ số đúng số học. */
	@Test
	void summarizesAllFiveKpisForThePeriod() {
		Employee employee = employee(1L, 200L, "Lap trinh vien");
		TimeEntry billable = timeEntry(1L, 200L, 10L, new BigDecimal("8.00"), true, FROM);
		TimeEntry nonBillable = timeEntry(2L, 200L, 11L, new BigDecimal("10.00"), false, FROM.plusDays(1));

		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of(billable, nonBillable));
		when(taskRepository.findAllById(any())).thenReturn(List.of(task(10L, 100L), task(11L, 101L)));
		when(projectRepository.findAllById(any())).thenReturn(List.of(project(100L, 5000L), project(101L, 5001L)));
		when(employeeRepository.findByUser_IdIn(List.of(200L))).thenReturn(List.of(employee));
		when(employeeHourlyRateService.resolve(eq(1L), any()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("200000.00"), FROM, false));
		when(contractBillRateService.resolve(5000L, "Lap trinh vien", "Senior", FROM))
				.thenReturn(new ResolvedContractBillRateRes(new BigDecimal("4000000.00"), FROM, true));
		when(workTypeRateService.resolveFactor(WorkType.NORMAL)).thenReturn(BigDecimal.ONE);
		when(dashboardQueryRepository.sumApprovedBillableHours(FROM, TO)).thenReturn(new BigDecimal("112.00"));
		// Tháng 1/2026 có 22 ngày làm việc: toàn thời gian 40h/tuần = 176h; bán thời gian 20h/tuần vào làm 15/1 = 12 ngày = 48h.
		when(dashboardQueryRepository.findEmployeesEmployedBetween(FROM, TO)).thenReturn(List.of(
				staff("40.00", LocalDate.of(2025, 6, 1), null), staff("20.00", LocalDate.of(2026, 1, 15), null)));
		when(invoiceService.listOverdue(TO, null))
				.thenReturn(List.of(mock(InvoiceDetailRes.class), mock(InvoiceDetailRes.class)));

		DashboardSummaryRes result = service.getSummary(new ReportPeriodReq(FROM, TO));

		// dailyRate 4,000,000 / 8h = 500,000/h -> doanh thu 8h = 4,000,000; giá vốn (8h + 10h) x 200,000 = 3,600,000
		assertThat(result.from()).isEqualTo(FROM);
		assertThat(result.to()).isEqualTo(TO);
		assertThat(result.kpis().recognizedRevenue()).isEqualByComparingTo("4000000.00");
		assertThat(result.kpis().averageMarginRate()).isEqualByComparingTo("0.1000");
		// 112 giờ tính phí / (176 + 48) giờ chuẩn (QTN-23), không chia cho tổng giờ đã ghi
		assertThat(result.kpis().billableHoursRatio()).isEqualByComparingTo("0.5000");
		assertThat(result.kpis().negativeMarginProjectCount()).isEqualTo(1);
		assertThat(result.kpis().overdueInvoiceCount()).isEqualTo(2);
		assertThat(result.missingCostEntryCount()).isZero();
		assertThat(result.missingRevenueEntryCount()).isZero();
	}

	/** TC-02: kỳ chưa có hoạt động nào -> mọi chỉ số bằng 0, không lỗi. */
	@Test
	void returnsZeroKpisWhenPeriodHasNoActivity() {
		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of());
		when(dashboardQueryRepository.sumApprovedBillableHours(FROM, TO)).thenReturn(BigDecimal.ZERO);
		when(invoiceService.listOverdue(TO, null)).thenReturn(List.of());

		DashboardSummaryRes result = service.getSummary(new ReportPeriodReq(FROM, TO));

		assertThat(result.kpis().recognizedRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.kpis().averageMarginRate()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.kpis().billableHoursRatio()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.kpis().negativeMarginProjectCount()).isZero();
		assertThat(result.kpis().overdueInvoiceCount()).isZero();
		verifyNoInteractions(taskRepository, projectRepository, employeeRepository);
	}

	/** Kỳ kết thúc trong tương lai: quá hạn tính đến hôm nay, không tính đến ngày cuối kỳ chưa tới. */
	@Test
	void countsOverdueInvoicesAsOfTodayWhenPeriodEndsInTheFuture() {
		LocalDate futureEnd = LocalDate.of(2026, 2, 28);
		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, futureEnd))
				.thenReturn(List.of());
		when(dashboardQueryRepository.sumApprovedBillableHours(FROM, futureEnd)).thenReturn(BigDecimal.ZERO);
		when(invoiceService.listOverdue(TODAY, null)).thenReturn(List.of(mock(InvoiceDetailRes.class)));

		DashboardSummaryRes result = service.getSummary(new ReportPeriodReq(FROM, futureEnd));

		assertThat(result.kpis().overdueInvoiceCount()).isEqualTo(1);
		verify(invoiceService).listOverdue(TODAY, null);
	}

	/** Dòng thiếu đơn giá bán bị loại khỏi doanh thu và được đếm, không làm hỏng cả bảng; giá vốn vẫn tính. */
	@Test
	void countsEntriesMissingRevenueRateInsteadOfFailing() {
		Employee employee = employee(1L, 200L, "Lap trinh vien");
		TimeEntry entry = timeEntry(1L, 200L, 10L, new BigDecimal("5.00"), true, FROM);

		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of(entry));
		when(taskRepository.findAllById(any())).thenReturn(List.of(task(10L, 100L)));
		when(projectRepository.findAllById(any())).thenReturn(List.of(project(100L, 5000L)));
		when(employeeRepository.findByUser_IdIn(List.of(200L))).thenReturn(List.of(employee));
		when(employeeHourlyRateService.resolve(eq(1L), any()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("150000.00"), FROM, false));
		when(contractBillRateService.resolve(5000L, "Lap trinh vien", "Senior", FROM))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Chua khai bao don gia"));
		when(dashboardQueryRepository.sumApprovedBillableHours(FROM, TO)).thenReturn(new BigDecimal("5.00"));
		when(dashboardQueryRepository.findEmployeesEmployedBetween(FROM, TO))
				.thenReturn(List.of(staff("40.00", LocalDate.of(2025, 1, 1), null)));
		when(invoiceService.listOverdue(TO, null)).thenReturn(List.of());

		DashboardSummaryRes result = service.getSummary(new ReportPeriodReq(FROM, TO));

		assertThat(result.missingRevenueEntryCount()).isEqualTo(1);
		assertThat(result.kpis().recognizedRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.kpis().averageMarginRate()).isEqualByComparingTo(BigDecimal.ZERO);
		// doanh thu 0 nhưng còn giá vốn 750,000 -> dự án bị tính là âm biên
		assertThat(result.kpis().negativeMarginProjectCount()).isEqualTo(1);
		// 5 giờ tính phí / 176 giờ chuẩn của tháng 1/2026
		assertThat(result.kpis().billableHoursRatio()).isEqualByComparingTo("0.0284");
	}

	/** Có giờ tính phí nhưng không nhân sự nào đang làm việc trong kỳ: mẫu số 0 -> tỷ lệ 0, không chia cho 0. */
	@Test
	void billableHoursRatioIsZeroWhenNobodyIsEmployedInThePeriod() {
		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of());
		when(dashboardQueryRepository.sumApprovedBillableHours(FROM, TO)).thenReturn(new BigDecimal("8.00"));
		when(invoiceService.listOverdue(TO, null)).thenReturn(List.of());

		DashboardSummaryRes result = service.getSummary(new ReportPeriodReq(FROM, TO));

		assertThat(result.kpis().billableHoursRatio()).isEqualByComparingTo(BigDecimal.ZERO);
	}

	/** TC-04: mỗi lượt xem thành công ghi nhật ký (người thực hiện/thời điểm do AuditLogService tự điền). */
	@Test
	void recordsAuditAndSensitiveAccessLogsForSuccessfulView() {
		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of());
		when(dashboardQueryRepository.sumApprovedBillableHours(FROM, TO)).thenReturn(BigDecimal.ZERO);
		when(invoiceService.listOverdue(TO, null)).thenReturn(List.of());

		service.getSummary(new ReportPeriodReq(FROM, TO));

		verify(auditLogService).record(eq("Xem bảng điều khiển vận hành"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Bảng điều khiển vận hành"), contains("2026-01-01 - 2026-01-31"));
		verify(sensitiveAccessLogger).logView(eq(SensitiveDataType.MARGIN), isNull(), eq("OperationalDashboard"),
				contains("2026-01-01 - 2026-01-31"));
	}

	@Test
	void rejectsMissingOrInvertedPeriodWithoutLogging() {
		assertThatThrownBy(() -> service.getSummary(null)).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> service.getSummary(new ReportPeriodReq(null, TO))).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> service.getSummary(new ReportPeriodReq(FROM, null))).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> service.getSummary(new ReportPeriodReq(TO, FROM))).isInstanceOf(BusinessRuleException.class);

		verifyNoInteractions(timeEntryRepository, dashboardQueryRepository, invoiceService, auditLogService,
				sensitiveAccessLogger);
	}

	private static Task task(Long id, Long projectId) {
		Task task = new Task();
		task.setId(id);
		task.setProjectId(projectId);
		return task;
	}

	private static Project project(Long id, Long contractId) {
		Project project = new Project();
		project.setId(id);
		project.setContractId(contractId);
		return project;
	}

	private static Employee employee(Long employeeId, Long userId, String role) {
		Employee employee = new Employee();
		employee.setId(employeeId);
		employee.setProfessionalRole(role);
		employee.setLevel("Senior");
		User user = new User();
		user.setId(userId);
		user.setFullName("Nguyen Van " + userId);
		employee.setUser(user);
		return employee;
	}

	private static Employee staff(String standardHoursPerWeek, LocalDate hireDate, LocalDate endDate) {
		Employee employee = new Employee();
		employee.setStandardHoursPerWeek(new BigDecimal(standardHoursPerWeek));
		employee.setHireDate(hireDate);
		employee.setEndDate(endDate);
		return employee;
	}

	private static TimeEntry timeEntry(Long id, Long userId, Long taskId, BigDecimal hours, boolean billable, LocalDate workDate) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setUserId(userId);
		entry.setTaskId(taskId);
		entry.setHours(hours);
		entry.setBillable(billable);
		entry.setWorkDate(workDate);
		entry.setStatus(TimeEntryStatus.APPROVED);
		entry.setWorkType(WorkType.NORMAL);
		return entry;
	}
}
