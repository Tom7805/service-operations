package com.serviceops.modules.profitability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.impl.RevenueRecognitionServiceImpl;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;
import com.serviceops.modules.rate.service.RateResolutionService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.WorkType;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class RevenueRecognitionServiceTest {

	@Mock private ProjectRepository projectRepository;
	@Mock private ContractRepository contractRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private RateResolutionService rateResolutionService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private RevenueRecognitionServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new RevenueRecognitionServiceImpl(projectRepository, contractRepository, taskRepository,
				timeEntryRepository, employeeRepository, rateResolutionService, sensitiveAccessLogger);
	}

	private Project project(Long id, Long contractId) {
		Project p = new Project();
		p.setId(id);
		p.setContractId(contractId);
		return p;
	}

	private Contract contract(Long id, ContractType type, BigDecimal totalValue) {
		Contract c = new Contract();
		c.setId(id);
		c.setContractType(type);
		c.setTotalValue(totalValue);
		return c;
	}

	private Task task(Long id, Long projectId, TaskStatus status) {
		Task t = new Task();
		t.setId(id);
		t.setProjectId(projectId);
		t.setStatus(status);
		return t;
	}

	private TimeEntry entry(Long id, Long userId, BigDecimal hours, boolean billable) {
		TimeEntry e = new TimeEntry();
		e.setId(id);
		e.setUserId(userId);
		e.setHours(hours);
		e.setWorkDate(LocalDate.of(2026, 6, 30));
		e.setStatus(TimeEntryStatus.APPROVED);
		e.setBillable(billable);
		e.setWorkType(WorkType.NORMAL);
		return e;
	}

	private Employee employee(Long id, Long userId) {
		Employee emp = new Employee();
		emp.setId(id);
		User user = new User();
		user.setId(userId);
		emp.setUser(user);
		return emp;
	}

	@Test
	@DisplayName("NCL-09-CN-002-TC-01: Hop dong theo gio - doanh thu = tong gio da duyet nhan don gia tung dong")
	void calculatesHourlyRevenueFromApprovedEntries() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project(1L, 5L)));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(
				contract(5L, ContractType.TIME_AND_MATERIAL, new BigDecimal("100000000"))));
		Task task = task(20L, 1L, TaskStatus.IN_PROGRESS);
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));

		TimeEntry entry = entry(30L, 100L, new BigDecimal("8.00"), true);
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(20L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(entry));
		when(employeeRepository.findAllById(List.of(100L))).thenReturn(List.of(employee(10L, 100L)));

		when(rateResolutionService.resolveForTimeEntry(30L)).thenReturn(new ResolvedRateRes(
				30L, 20L, 1L, 5L, "Lập trình viên", "Cao cấp", entry.getWorkDate(), entry.getHours(),
				WorkType.NORMAL, new BigDecimal("2400000"), LocalDate.of(2026, 1, 1), true,
				new BigDecimal("1.00"), new BigDecimal("2400000.00")));

		RecognizedRevenueRes result = service.calculateRecognizedRevenue(1L);

		assertThat(result.recognitionMethod()).isEqualTo(RecognitionMethod.HOURLY);
		// appliedDailyRate 2.400.000 / 8h = 300.000/h * 8h = 2.400.000
		assertThat(result.totalRecognizedRevenue()).isEqualByComparingTo("2400000.00");
		assertThat(result.totalBillableHours()).isEqualByComparingTo("8.00");
		assertThat(result.missingRateEntryCount()).isZero();
		assertThat(result.excludedLineCount()).isZero();
		assertThat(result.lines()).hasSize(1);

		verify(sensitiveAccessLogger).logView(SensitiveDataType.REVENUE, 1L, "ProjectRecognizedRevenue",
				"Xem doanh thu ghi nhan cua du an #1");
	}

	@Test
	@DisplayName("NCL-09-CN-002-TC-03: Dong khong tinh phi bi loai khoi doanh thu")
	void excludesNonBillableEntryFromRevenue() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project(1L, 5L)));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(
				contract(5L, ContractType.TIME_AND_MATERIAL, new BigDecimal("100000000"))));
		Task task = task(20L, 1L, TaskStatus.IN_PROGRESS);
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));

		TimeEntry billableEntry = entry(30L, 100L, new BigDecimal("8.00"), true);
		TimeEntry nonBillableEntry = entry(31L, 100L, new BigDecimal("2.00"), false);
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(20L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(billableEntry, nonBillableEntry));
		when(employeeRepository.findAllById(List.of(100L))).thenReturn(List.of(employee(10L, 100L)));

		when(rateResolutionService.resolveForTimeEntry(30L)).thenReturn(new ResolvedRateRes(
				30L, 20L, 1L, 5L, "Lập trình viên", "Cao cấp", billableEntry.getWorkDate(), billableEntry.getHours(),
				WorkType.NORMAL, new BigDecimal("800000"), LocalDate.of(2026, 1, 1), true,
				new BigDecimal("1.00"), new BigDecimal("800000.00")));

		RecognizedRevenueRes result = service.calculateRecognizedRevenue(1L);

		// don gia/gio = 800.000 / 8 = 100.000; doanh thu = 8h * 100.000 = 800.000 (dong 2h khong tinh phi bi loai)
		assertThat(result.totalRecognizedRevenue()).isEqualByComparingTo("800000.00");
		assertThat(result.excludedLineCount()).isEqualTo(1);
		assertThat(result.lines()).hasSize(2);
		assertThat(result.lines().stream().filter(l -> !l.billable()).findFirst().orElseThrow().lineRevenue())
				.isEqualByComparingTo("0");
	}

	@Test
	@DisplayName("Thieu don gia hieu luc thi danh dau missingRateData, khong chan ca luot tinh")
	void marksMissingRateDataWithoutFailingWholeCalculation() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project(1L, 5L)));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(
				contract(5L, ContractType.TIME_AND_MATERIAL, new BigDecimal("100000000"))));
		Task task = task(20L, 1L, TaskStatus.IN_PROGRESS);
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));

		TimeEntry entry = entry(30L, 100L, new BigDecimal("8.00"), true);
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(20L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(entry));
		when(employeeRepository.findAllById(List.of(100L))).thenReturn(List.of(employee(10L, 100L)));

		when(rateResolutionService.resolveForTimeEntry(30L))
				.thenThrow(new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Chua khai bao cap bac"));

		RecognizedRevenueRes result = service.calculateRecognizedRevenue(1L);

		assertThat(result.totalRecognizedRevenue()).isZero();
		assertThat(result.missingRateEntryCount()).isEqualTo(1);
		assertThat(result.lines().get(0).missingRateData()).isTrue();
	}

	@Test
	@DisplayName("NCL-09-CN-002-TC-02: Hop dong tron goi - doanh thu = gia tri hop dong nhan ty le hoan thanh")
	void calculatesPercentageOfCompletionRevenue() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project(1L, 5L)));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(
				contract(5L, ContractType.FIXED_PRICE, new BigDecimal("100000000"))));
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(
				task(1L, 1L, TaskStatus.DONE),
				task(2L, 1L, TaskStatus.DONE),
				task(3L, 1L, TaskStatus.DONE),
				task(4L, 1L, TaskStatus.IN_PROGRESS),
				task(5L, 1L, TaskStatus.TODO)));

		RecognizedRevenueRes result = service.calculateRecognizedRevenue(1L);

		assertThat(result.recognitionMethod()).isEqualTo(RecognitionMethod.PERCENTAGE_OF_COMPLETION);
		assertThat(result.completionRate()).isEqualByComparingTo("0.6000");
		assertThat(result.totalTaskCount()).isEqualTo(5);
		assertThat(result.doneTaskCount()).isEqualTo(3);
		assertThat(result.totalRecognizedRevenue()).isEqualByComparingTo("60000000.00");
	}

	@Test
	@DisplayName("Loai hop dong chua ho tro (MAINTENANCE/MILESTONE) thi bao INVALID_STATE")
	void rejectsUnsupportedContractType() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project(1L, 5L)));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(
				contract(5L, ContractType.MAINTENANCE, new BigDecimal("100000000"))));

		assertThatThrownBy(() -> service.calculateRecognizedRevenue(1L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
	}

	@Test
	@DisplayName("Khong tim thay du an thi bao RESOURCE_NOT_FOUND")
	void rejectsUnknownProject() {
		when(projectRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.calculateRecognizedRevenue(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
