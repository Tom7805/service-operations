package com.serviceops.modules.profitability;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.profitability.dto.response.PlannedVsActualMarginRes;
import com.serviceops.modules.profitability.service.impl.EntryMarginCalculator;
import com.serviceops.modules.profitability.service.impl.MarginComparisonServiceImpl;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.entity.QuoteItem;
import com.serviceops.modules.quotation.repository.QuoteRepository;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarginComparisonServiceTest {

	@Mock private ProjectRepository projectRepository;
	@Mock private ContractRepository contractRepository;
	@Mock private QuoteRepository quoteRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private EmployeeHourlyRateService employeeHourlyRateService;
	@Mock private EntryMarginCalculator entryMarginCalculator;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private MarginComparisonServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new MarginComparisonServiceImpl(projectRepository, contractRepository, quoteRepository,
				taskRepository, timeEntryRepository, employeeRepository, employeeHourlyRateService,
				entryMarginCalculator, sensitiveAccessLogger);
	}

	/** NCL-09-CN-006-TC-01: du an bao gia bien 30% va thuc te dat 18% -> chenh lech -12 diem % kem ly do. */
	@Test
	void compare_returnsPlannedAndActualMarginsWithGapAndReasons() {
		Project project = project(42L, 500L);
		Contract contract = contract(500L, 7L);
		Quote quote = quote(7L, 2, new BigDecimal("100000000.00"), LocalDate.of(2026, 1, 1));
		quote.addItem(quoteItem("Lap trinh vien", new BigDecimal("20.00")));

		when(projectRepository.findById(42L)).thenReturn(Optional.of(project));
		when(contractRepository.findById(500L)).thenReturn(Optional.of(contract));
		when(quoteRepository.findById(7L)).thenReturn(Optional.of(quote));

		Employee roleRefEmployee = employee(1L, 900L, "Lap trinh vien");
		when(employeeRepository.findByProfessionalRoleIgnoreCase("Lap trinh vien")).thenReturn(List.of(roleRefEmployee));
		when(employeeHourlyRateService.resolve(1L, LocalDate.of(2026, 1, 1)))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("437500.00"), LocalDate.of(2026, 1, 1), false));

		Task task = task(10L, 42L);
		when(taskRepository.findByProjectIdOrderByIdAsc(42L)).thenReturn(List.of(task));
		TimeEntry entry = timeEntry(1L, 800L, 10L, new BigDecimal("178.00"));
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(10L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(entry));
		Employee actualEmployee = employee(2L, 800L, "Lap trinh vien");
		when(employeeRepository.findByUser_IdIn(List.of(800L))).thenReturn(List.of(actualEmployee));
		when(entryMarginCalculator.resolve(entry, actualEmployee, 500L)).thenReturn(
				new EntryMarginCalculator.Result(new BigDecimal("82000000.00"), false,
						new BigDecimal("100000000.00"), false));

		PlannedVsActualMarginRes result = service.compare(42L);

		assertThat(result.plannedRevenue()).isEqualByComparingTo("100000000.00");
		assertThat(result.plannedCost()).isEqualByComparingTo("70000000.00");
		assertThat(result.plannedMarginPercent()).isEqualByComparingTo("30.00");

		assertThat(result.actualRevenue()).isEqualByComparingTo("100000000.00");
		assertThat(result.actualCost()).isEqualByComparingTo("82000000.00");
		assertThat(result.actualMarginPercent()).isEqualByComparingTo("18.00");

		assertThat(result.marginGapPercentPoints()).isEqualByComparingTo("-12.00");
		assertThat(result.hoursVarianceVsPlanned()).isEqualByComparingTo("18.00");
		assertThat(result.gapReasons()).isNotEmpty();
		assertThat(result.missingPlannedCostItemCount()).isZero();
		assertThat(result.missingActualCostEntryCount()).isZero();
		assertThat(result.missingActualRevenueEntryCount()).isZero();
	}

	/** NCL-09-CN-006-TC-02: du an chua gan bao gia nao (hop dong khong co quoteId) -> bao thieu du lieu ke hoach. */
	@Test
	void compare_throwsResourceNotFound_whenContractHasNoQuote() {
		Project project = project(42L, 500L);
		Contract contract = contract(500L, null);
		when(projectRepository.findById(42L)).thenReturn(Optional.of(project));
		when(contractRepository.findById(500L)).thenReturn(Optional.of(contract));

		assertThatThrownBy(() -> service.compare(42L))
				.isInstanceOf(BusinessRuleException.class)
				.satisfies(ex -> assertThat(((BusinessRuleException) ex).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
	}

	@Test
	void compare_throwsResourceNotFound_whenProjectMissing() {
		when(projectRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.compare(99L)).isInstanceOf(BusinessRuleException.class);
	}

	/** Vai tro trong dong bao gia chua co nhan su nao dam nhiem -> loai khoi chi phi du kien, dem vao missingPlannedCostItemCount. */
	@Test
	void compare_countsMissingPlannedCostItem_whenNoEmployeeHoldsQuotedRole() {
		Project project = project(42L, 500L);
		Contract contract = contract(500L, 7L);
		Quote quote = quote(7L, 1, new BigDecimal("50000000.00"), LocalDate.of(2026, 1, 1));
		quote.addItem(quoteItem("Kien truc su he thong", new BigDecimal("10.00")));

		when(projectRepository.findById(42L)).thenReturn(Optional.of(project));
		when(contractRepository.findById(500L)).thenReturn(Optional.of(contract));
		when(quoteRepository.findById(7L)).thenReturn(Optional.of(quote));
		when(employeeRepository.findByProfessionalRoleIgnoreCase("Kien truc su he thong")).thenReturn(List.of());
		when(taskRepository.findByProjectIdOrderByIdAsc(42L)).thenReturn(List.of());

		PlannedVsActualMarginRes result = service.compare(42L);

		assertThat(result.missingPlannedCostItemCount()).isEqualTo(1);
		assertThat(result.plannedCost()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.actualHours()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.actualMarginPercent()).isNull();
		assertThat(result.marginGapPercentPoints()).isNull();
	}

	private static Project project(Long id, Long contractId) {
		Project project = new Project();
		project.setId(id);
		project.setContractId(contractId);
		return project;
	}

	private static Contract contract(Long id, Long quoteId) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setQuoteId(quoteId);
		return contract;
	}

	private static Quote quote(Long id, int version, BigDecimal totalAmount, LocalDate createdAt) {
		Quote quote = new Quote();
		quote.setId(id);
		quote.setVersion(version);
		quote.setTotalAmount(totalAmount);
		quote.setCreatedAt(createdAt.atStartOfDay());
		return quote;
	}

	private static QuoteItem quoteItem(String role, BigDecimal workDays) {
		QuoteItem item = new QuoteItem();
		item.setProfessionalRole(role);
		item.setWorkDays(workDays);
		return item;
	}

	private static Task task(Long id, Long projectId) {
		Task task = new Task();
		task.setId(id);
		task.setProjectId(projectId);
		return task;
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

	private static TimeEntry timeEntry(Long id, Long userId, Long taskId, BigDecimal hours) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setUserId(userId);
		entry.setTaskId(taskId);
		entry.setHours(hours);
		entry.setBillable(true);
		entry.setWorkDate(LocalDate.of(2026, 2, 1));
		entry.setStatus(TimeEntryStatus.APPROVED);
		return entry;
	}
}
