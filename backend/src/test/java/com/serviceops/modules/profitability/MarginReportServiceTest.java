package com.serviceops.modules.profitability;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.profitability.dto.request.ProfitQueryReq;
import com.serviceops.modules.profitability.dto.response.MarginByCustomerRes;
import com.serviceops.modules.profitability.dto.response.MarginByEmployeeRes;
import com.serviceops.modules.profitability.service.impl.MarginReportServiceImpl;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.ContractBillRateService;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import com.serviceops.modules.rate.service.WorkTypeRateService;
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
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarginReportServiceTest {

	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private ProjectRepository projectRepository;
	@Mock private CustomerRepository customerRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private EmployeeHourlyRateService employeeHourlyRateService;
	@Mock private ContractBillRateService contractBillRateService;
	@Mock private WorkTypeRateService workTypeRateService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private MarginReportServiceImpl service;

	private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
	private static final LocalDate TO = LocalDate.of(2026, 1, 31);

	@BeforeEach
	void setUp() {
		service = new MarginReportServiceImpl(timeEntryRepository, taskRepository, projectRepository,
				customerRepository, employeeRepository, employeeHourlyRateService, contractBillRateService,
				workTypeRateService, sensitiveAccessLogger);
	}

	/** NCL-09-CN-005-TC-01: ba khach hang mo phong, moi khach hang co doanh thu/gia von/bien rieng. */
	@Test
	void marginByCustomer_aggregatesRevenueCostAndMarginPerCustomer() {
		Task task1 = task(10L, 100L);
		Task task2 = task(11L, 101L);
		Project project1 = project(100L, 1000L, 5000L);
		Project project2 = project(101L, 1001L, 5001L);
		Customer customer1 = customer(1000L, "KH001", "Cong ty A");
		Customer customer2 = customer(1001L, "KH002", "Cong ty B");
		Employee employee = employee(1L, 200L, "Lap trinh vien");

		TimeEntry entry1 = timeEntry(1L, 200L, 10L, new BigDecimal("8.00"), true, FROM);
		TimeEntry entry2 = timeEntry(2L, 200L, 11L, new BigDecimal("4.00"), true, FROM.plusDays(1));

		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of(entry1, entry2));
		when(taskRepository.findAllById(List.of(10L, 11L))).thenReturn(List.of(task1, task2));
		when(projectRepository.findAllById(List.of(100L, 101L))).thenReturn(List.of(project1, project2));
		when(customerRepository.findAllById(List.of(1000L, 1001L))).thenReturn(List.of(customer1, customer2));
		when(employeeRepository.findByUser_IdIn(List.of(200L))).thenReturn(List.of(employee));

		when(employeeHourlyRateService.resolve(1L, entry1.getWorkDate()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("200000.00"), FROM, false));
		when(employeeHourlyRateService.resolve(1L, entry2.getWorkDate()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("200000.00"), FROM, false));

		when(contractBillRateService.resolve(5000L, "Lap trinh vien", "Chưa phân loại", entry1.getWorkDate()))
				.thenReturn(new ResolvedContractBillRateRes(new BigDecimal("4000000.00"), FROM, true));
		when(contractBillRateService.resolve(5001L, "Lap trinh vien", "Chưa phân loại", entry2.getWorkDate()))
				.thenReturn(new ResolvedContractBillRateRes(new BigDecimal("4000000.00"), FROM, true));
		when(workTypeRateService.resolveFactor(WorkType.NORMAL)).thenReturn(BigDecimal.ONE);

		MarginByCustomerRes result = service.marginByCustomer(new ProfitQueryReq(FROM, TO));

		assertThat(result.lines()).hasSize(2);
		assertThat(result.missingCostEntryCount()).isZero();
		assertThat(result.missingRevenueEntryCount()).isZero();

		// dailyRate 4,000,000 / 8h = 500,000/h -> KH A: 8h*500,000=4,000,000 doanh thu, 8h*200,000=1,600,000 gia von
		var lineA = result.lines().stream().filter(l -> l.customerId().equals(1000L)).findFirst().orElseThrow();
		assertThat(lineA.revenue()).isEqualByComparingTo("4000000.00");
		assertThat(lineA.cost()).isEqualByComparingTo("1600000.00");
		assertThat(lineA.margin()).isEqualByComparingTo("2400000.00");

		var lineB = result.lines().stream().filter(l -> l.customerId().equals(1001L)).findFirst().orElseThrow();
		assertThat(lineB.revenue()).isEqualByComparingTo("2000000.00");
		assertThat(lineB.cost()).isEqualByComparingTo("800000.00");
		assertThat(lineB.margin()).isEqualByComparingTo("1200000.00");

		assertThat(result.totalRevenue()).isEqualByComparingTo("6000000.00");
		assertThat(result.totalCost()).isEqualByComparingTo("2400000.00");
		assertThat(result.totalMargin()).isEqualByComparingTo("3600000.00");
	}

	/** NCL-09-CN-002-TC-03 (dung lam nen cho NCL-09-CN-005): dong khong tinh phi bi loai khoi doanh thu nhung van vao gia von. */
	@Test
	void marginByEmployee_excludesNonBillableEntryFromRevenueButKeepsCost() {
		Task task = task(10L, 100L);
		Project project = project(100L, 1000L, 5000L);
		Customer customer = customer(1000L, "KH001", "Cong ty A");
		Employee employee = employee(1L, 200L, "Lap trinh vien");
		TimeEntry entry = timeEntry(1L, 200L, 10L, new BigDecimal("6.00"), false, FROM);

		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of(entry));
		when(taskRepository.findAllById(List.of(10L))).thenReturn(List.of(task));
		when(projectRepository.findAllById(List.of(100L))).thenReturn(List.of(project));
		when(customerRepository.findAllById(List.of(1000L))).thenReturn(List.of(customer));
		when(employeeRepository.findByUser_IdIn(List.of(200L))).thenReturn(List.of(employee));
		when(employeeHourlyRateService.resolve(1L, entry.getWorkDate()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("150000.00"), FROM, false));

		MarginByEmployeeRes result = service.marginByEmployee(new ProfitQueryReq(FROM, TO));

		assertThat(result.lines()).hasSize(1);
		assertThat(result.lines().get(0).revenue()).isEqualByComparingTo("0.00");
		assertThat(result.lines().get(0).cost()).isEqualByComparingTo("900000.00");
		assertThat(result.missingRevenueEntryCount()).isZero();
		verifyNoInteractions(contractBillRateService);
	}

	/** Thieu du lieu don gia ban o cap bac mac dinh: dong bi loai khoi doanh thu va dem vao missingRevenueEntryCount, khong lam hong ca bao cao. */
	@Test
	void marginByCustomer_countsMissingRevenueWhenBillRateNotConfigured() {
		Task task = task(10L, 100L);
		Project project = project(100L, 1000L, 5000L);
		Customer customer = customer(1000L, "KH001", "Cong ty A");
		Employee employee = employee(1L, 200L, "Lap trinh vien");
		TimeEntry entry = timeEntry(1L, 200L, 10L, new BigDecimal("5.00"), true, FROM);

		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of(entry));
		when(taskRepository.findAllById(List.of(10L))).thenReturn(List.of(task));
		when(projectRepository.findAllById(List.of(100L))).thenReturn(List.of(project));
		when(customerRepository.findAllById(List.of(1000L))).thenReturn(List.of(customer));
		when(employeeRepository.findByUser_IdIn(List.of(200L))).thenReturn(List.of(employee));
		when(employeeHourlyRateService.resolve(1L, entry.getWorkDate()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("150000.00"), FROM, false));
		when(contractBillRateService.resolve(5000L, "Lap trinh vien", "Chưa phân loại", entry.getWorkDate()))
				.thenThrow(new BusinessRuleException(com.serviceops.common.exception.ErrorCode.RESOURCE_NOT_FOUND,
						"Chua khai bao don gia"));

		MarginByCustomerRes result = service.marginByCustomer(new ProfitQueryReq(FROM, TO));

		assertThat(result.missingRevenueEntryCount()).isEqualTo(1);
		assertThat(result.lines().get(0).revenue()).isEqualByComparingTo("0.00");
		assertThat(result.lines().get(0).cost()).isEqualByComparingTo("750000.00");
	}

	@Test
	void rejectsMissingPeriodBoundaries() {
		assertThatThrownBy(() -> service.marginByCustomer(new ProfitQueryReq(null, TO)))
				.isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> service.marginByEmployee(new ProfitQueryReq(FROM, null)))
				.isInstanceOf(BusinessRuleException.class);
	}

	@Test
	void rejectsFromAfterTo() {
		assertThatThrownBy(() -> service.marginByCustomer(new ProfitQueryReq(TO, FROM)))
				.isInstanceOf(BusinessRuleException.class);
	}

	/** Ky rong: khong co gio cong nao -> bao cao tra danh sach rong, khong loi. */
	@Test
	void returnsEmptyReportWhenNoApprovedEntriesInPeriod() {
		when(timeEntryRepository.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, FROM, TO))
				.thenReturn(List.of());

		MarginByCustomerRes result = service.marginByCustomer(new ProfitQueryReq(FROM, TO));

		assertThat(result.lines()).isEmpty();
		assertThat(result.totalRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.totalMarginPercent()).isNull();
	}

	private static Task task(Long id, Long projectId) {
		Task task = new Task();
		task.setId(id);
		task.setProjectId(projectId);
		return task;
	}

	private static Project project(Long id, Long customerId, Long contractId) {
		Project project = new Project();
		project.setId(id);
		project.setCustomerId(customerId);
		project.setContractId(contractId);
		return project;
	}

	private static Customer customer(Long id, String code, String name) {
		Customer customer = new Customer();
		customer.setId(id);
		customer.setCode(code);
		customer.setName(name);
		return customer;
	}

	private static Employee employee(Long employeeId, Long userId, String role) {
		Employee employee = new Employee();
		employee.setId(employeeId);
		employee.setProfessionalRole(role);
		User user = new User();
		user.setId(userId);
		user.setFullName("Nguyen Van " + userId);
		employee.setUser(user);
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
