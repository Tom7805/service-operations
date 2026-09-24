package com.serviceops.modules.invoice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.enums.ExpenseType;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.invoice.dto.request.InvoiceProposalCreateReq;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;
import com.serviceops.modules.invoice.entity.InvoiceProposal;
import com.serviceops.modules.invoice.entity.InvoiceProposalLine;
import com.serviceops.modules.invoice.repository.InvoiceLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceProposalLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceProposalRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.service.InvoiceProposalService;
import com.serviceops.modules.invoice.service.impl.InvoiceProposalServiceImpl;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.rate.repository.BillRateRepository;
import com.serviceops.modules.rate.repository.ContractBillRateRepository;
import com.serviceops.modules.rate.repository.WorkTypeRateFactorRepository;
import com.serviceops.modules.rate.service.BillRateService;
import com.serviceops.modules.rate.service.ContractBillRateService;
import com.serviceops.modules.rate.service.RateResolutionService;
import com.serviceops.modules.rate.service.WorkTypeRateService;
import com.serviceops.modules.rate.service.impl.BillRateServiceImpl;
import com.serviceops.modules.rate.service.impl.ContractBillRateServiceImpl;
import com.serviceops.modules.rate.service.impl.RateResolutionServiceImpl;
import com.serviceops.modules.rate.service.impl.WorkTypeRateServiceImpl;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.WorkType;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Chay {@link InvoiceProposalServiceImpl} cung chuoi tra don gia THAT ({@code RateResolution -> ContractBillRate ->
 * BillRate}) qua proxy giao dich cua Spring — cac unit test dung mock nen khong bao gio di qua proxy. Dong gio cong
 * cua nhan su chua khai bao cap bac phai bi dem vao {@code missingRateCount} chu khong duoc lam transaction bi danh
 * dau rollback-only roi nem UnexpectedRollbackException (HTTP 500) — cung loi da gap o NCL-09-CN-002.
 */
@SpringJUnitConfig(InvoiceProposalTransactionTest.Config.class)
class InvoiceProposalTransactionTest {

	@Configuration
	@EnableTransactionManagement
	static class Config {

		@Bean
		DataSource dataSource() {
			return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).build();
		}

		@Bean
		PlatformTransactionManager transactionManager(DataSource dataSource) {
			return new DataSourceTransactionManager(dataSource);
		}

		@Bean ProjectRepository projectRepository() { return mock(ProjectRepository.class); }
		@Bean ContractRepository contractRepository() { return mock(ContractRepository.class); }
		@Bean TaskRepository taskRepository() { return mock(TaskRepository.class); }
		@Bean TimeEntryRepository timeEntryRepository() { return mock(TimeEntryRepository.class); }
		@Bean ProjectExpenseRepository projectExpenseRepository() { return mock(ProjectExpenseRepository.class); }
		@Bean EmployeeRepository employeeRepository() { return mock(EmployeeRepository.class); }
		@Bean UserRepository userRepository() { return mock(UserRepository.class); }
		@Bean InvoiceProposalRepository invoiceProposalRepository() { return mock(InvoiceProposalRepository.class); }
		@Bean InvoiceProposalLineRepository invoiceProposalLineRepository() { return mock(InvoiceProposalLineRepository.class); }
		@Bean InvoiceRepository invoiceRepository() { return mock(InvoiceRepository.class); }
		@Bean InvoiceLineRepository invoiceLineRepository() { return mock(InvoiceLineRepository.class); }
		@Bean ContractValueLimitValidator contractValueLimitValidator() { return new ContractValueLimitValidator(); }
		@Bean ContractBillRateRepository contractBillRateRepository() { return mock(ContractBillRateRepository.class); }
		@Bean BillRateRepository billRateRepository() { return mock(BillRateRepository.class); }
		@Bean WorkTypeRateFactorRepository workTypeRateFactorRepository() { return mock(WorkTypeRateFactorRepository.class); }
		@Bean AuditLogService auditLogService() { return mock(AuditLogService.class); }
		@Bean NotificationService notificationService() { return mock(NotificationService.class); }

		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-10-01T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}

		@Bean
		BillRateService billRateService(BillRateRepository billRateRepository, AuditLogService auditLogService) {
			return new BillRateServiceImpl(billRateRepository, auditLogService);
		}

		@Bean
		ContractBillRateService contractBillRateService(ContractBillRateRepository contractBillRateRepository,
				ContractRepository contractRepository, BillRateService billRateService,
				AuditLogService auditLogService) {
			return new ContractBillRateServiceImpl(contractBillRateRepository, contractRepository, billRateService,
					auditLogService);
		}

		@Bean
		WorkTypeRateService workTypeRateService(WorkTypeRateFactorRepository workTypeRateFactorRepository,
				AuditLogService auditLogService) {
			return new WorkTypeRateServiceImpl(workTypeRateFactorRepository, auditLogService);
		}

		@Bean
		RateResolutionService rateResolutionService(TimeEntryRepository timeEntryRepository,
				TaskRepository taskRepository, ProjectRepository projectRepository,
				EmployeeRepository employeeRepository, UserRepository userRepository,
				ContractBillRateService contractBillRateService, WorkTypeRateService workTypeRateService) {
			return new RateResolutionServiceImpl(timeEntryRepository, taskRepository, projectRepository,
					employeeRepository, userRepository, contractBillRateService, workTypeRateService);
		}

		@Bean
		InvoiceProposalService invoiceProposalService(ProjectRepository projectRepository,
				ContractRepository contractRepository, TaskRepository taskRepository,
				TimeEntryRepository timeEntryRepository, ProjectExpenseRepository projectExpenseRepository,
				InvoiceProposalRepository proposalRepository, InvoiceProposalLineRepository proposalLineRepository,
				InvoiceRepository invoiceRepository, InvoiceLineRepository invoiceLineRepository,
				ContractValueLimitValidator limitValidator,
				RateResolutionService rateResolutionService, NotificationService notificationService,
				AuditLogService auditLogService, Clock clock) {
			return new InvoiceProposalServiceImpl(projectRepository, contractRepository, taskRepository,
					timeEntryRepository, projectExpenseRepository, proposalRepository, proposalLineRepository,
					invoiceRepository, invoiceLineRepository, limitValidator,
					rateResolutionService, notificationService, auditLogService, clock);
		}
	}

	private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
	private static final LocalDate TO = LocalDate.of(2026, 9, 30);

	@Autowired private ProjectRepository projectRepository;
	@Autowired private ContractRepository contractRepository;
	@Autowired private TaskRepository taskRepository;
	@Autowired private TimeEntryRepository timeEntryRepository;
	@Autowired private ProjectExpenseRepository projectExpenseRepository;
	@Autowired private EmployeeRepository employeeRepository;
	@Autowired private InvoiceProposalRepository proposalRepository;
	@Autowired private InvoiceProposalLineRepository proposalLineRepository;
	@Autowired private InvoiceProposalService invoiceProposalService;

	@Test
	@DisplayName("Nhan su chua khai bao cap bac: dong bi dem vao missingRateCount, khong nem UnexpectedRollbackException")
	void missingLevelIsCountedInsteadOfMarkingTheTransactionRollbackOnly() {
		Project project = new Project();
		project.setId(1L);
		project.setProjectCode("PRJ-01");
		project.setContractId(5L);
		project.setProjectManagerId(7L);
		Contract contract = new Contract();
		contract.setId(5L);
		contract.setCustomerId(9L);
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		Task task = new Task();
		task.setId(20L);
		task.setProjectId(1L);
		task.setName("Phat trien API");

		TimeEntry entry = new TimeEntry();
		entry.setId(30L);
		entry.setTaskId(20L);
		entry.setUserId(100L);
		entry.setHours(new BigDecimal("8.00"));
		entry.setWorkDate(LocalDate.of(2026, 9, 10));
		entry.setStatus(TimeEntryStatus.APPROVED);
		entry.setBillable(true);
		entry.setWorkType(WorkType.NORMAL);

		User user = new User();
		user.setId(100L);
		Employee employee = new Employee();
		employee.setId(10L);
		employee.setUser(user);
		employee.setProfessionalRole("Lap trinh vien");
		employee.setLevel(null); // chua khai bao cap bac -> RateResolutionServiceImpl nem BusinessRuleException

		ProjectExpense expense = new ProjectExpense();
		expense.setId(50L);
		expense.setProjectId(1L);
		expense.setType(ExpenseType.TRAVEL);
		expense.setAmount(new BigDecimal("2000000.00"));
		expense.setExpenseDate(LocalDate.of(2026, 9, 12));
		expense.setDescription("Ve may bay");
		expense.setStatus(ExpenseStatus.APPROVED);
		expense.setBillable(true);
		expense.setInvoiced(false);

		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(contractRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(contract));
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));
		when(taskRepository.findById(20L)).thenReturn(Optional.of(task));
		when(timeEntryRepository.findByTaskIdInAndWorkDateBetweenOrderByWorkDateAscIdAsc(List.of(20L), FROM, TO))
				.thenReturn(List.of(entry));
		when(timeEntryRepository.findById(30L)).thenReturn(Optional.of(entry));
		when(employeeRepository.findByUser_Id(100L)).thenReturn(Optional.of(employee));
		when(projectExpenseRepository.findByProjectIdAndExpenseDateBetweenOrderByExpenseDateAscIdAsc(1L, FROM, TO))
				.thenReturn(List.of(expense));
		when(proposalRepository.save(any(InvoiceProposal.class))).thenAnswer(invocation -> {
			InvoiceProposal proposal = invocation.getArgument(0);
			proposal.setId(100L);
			return proposal;
		});
		when(proposalLineRepository.saveAll(anyCollection())).thenAnswer(invocation ->
				new ArrayList<InvoiceProposalLine>(invocation.<java.util.Collection<InvoiceProposalLine>>getArgument(0)));

		InvoiceProposalRes res = invoiceProposalService.createFromApprovedTimesheets(1L,
				new InvoiceProposalCreateReq(FROM, TO, null));

		assertThat(res.skipped().missingRateCount()).isEqualTo(1);
		assertThat(res.laborLines()).isEmpty();
		assertThat(res.expenseLines()).hasSize(1);
		assertThat(res.totalAmount()).isEqualByComparingTo("2000000.00");
	}

	@Test
	@DisplayName("Co cap bac nhung chua co don gia hieu luc (loi nem tu tang BillRateService): van tao duoc de nghi")
	void missingBillRateIsCountedInsteadOfMarkingTheTransactionRollbackOnly() {
		Project project = new Project();
		project.setId(2L);
		project.setProjectCode("PRJ-02");
		project.setContractId(6L);
		Contract contract = new Contract();
		contract.setId(6L);
		contract.setCustomerId(9L);
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		Task task = new Task();
		task.setId(21L);
		task.setProjectId(2L);
		task.setName("Kiem thu");

		TimeEntry entry = new TimeEntry();
		entry.setId(31L);
		entry.setTaskId(21L);
		entry.setUserId(101L);
		entry.setHours(new BigDecimal("8.00"));
		entry.setWorkDate(LocalDate.of(2026, 9, 10));
		entry.setStatus(TimeEntryStatus.APPROVED);
		entry.setBillable(true);
		entry.setWorkType(WorkType.NORMAL);

		User user = new User();
		user.setId(101L);
		Employee employee = new Employee();
		employee.setId(11L);
		employee.setUser(user);
		employee.setProfessionalRole("Kiem thu vien");
		employee.setLevel("Senior");

		ProjectExpense expense = new ProjectExpense();
		expense.setId(51L);
		expense.setProjectId(2L);
		expense.setType(ExpenseType.TOOLS);
		expense.setAmount(new BigDecimal("500000.00"));
		expense.setExpenseDate(LocalDate.of(2026, 9, 11));
		expense.setDescription("Giay phep cong cu");
		expense.setStatus(ExpenseStatus.APPROVED);
		expense.setBillable(true);
		expense.setInvoiced(false);

		when(projectRepository.findById(2L)).thenReturn(Optional.of(project));
		when(contractRepository.findByIdForUpdate(6L)).thenReturn(Optional.of(contract));
		when(contractRepository.existsById(6L)).thenReturn(true);
		when(taskRepository.findByProjectIdOrderByIdAsc(2L)).thenReturn(List.of(task));
		when(taskRepository.findById(21L)).thenReturn(Optional.of(task));
		when(timeEntryRepository.findByTaskIdInAndWorkDateBetweenOrderByWorkDateAscIdAsc(List.of(21L), FROM, TO))
				.thenReturn(List.of(entry));
		when(timeEntryRepository.findById(31L)).thenReturn(Optional.of(entry));
		when(employeeRepository.findByUser_Id(101L)).thenReturn(Optional.of(employee));
		when(projectExpenseRepository.findByProjectIdAndExpenseDateBetweenOrderByExpenseDateAscIdAsc(2L, FROM, TO))
				.thenReturn(List.of(expense));
		when(proposalRepository.save(any(InvoiceProposal.class))).thenAnswer(invocation -> {
			InvoiceProposal proposal = invocation.getArgument(0);
			proposal.setId(101L);
			return proposal;
		});
		when(proposalLineRepository.saveAll(anyCollection())).thenAnswer(invocation ->
				new ArrayList<InvoiceProposalLine>(invocation.<java.util.Collection<InvoiceProposalLine>>getArgument(0)));
		// contractBillRateRepository / billRateRepository mac dinh tra Optional.empty() -> BillRateServiceImpl nem
		// RESOURCE_NOT_FOUND di qua ba lop proxy giao dich truoc khi InvoiceProposalServiceImpl bat duoc.

		InvoiceProposalRes res = invoiceProposalService.createFromApprovedTimesheets(2L,
				new InvoiceProposalCreateReq(FROM, TO, null));

		assertThat(res.skipped().missingRateCount()).isEqualTo(1);
		assertThat(res.totalAmount()).isEqualByComparingTo("500000.00");
	}
}
