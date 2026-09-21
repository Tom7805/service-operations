package com.serviceops.modules.profitability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.modules.profitability.service.impl.EntryMarginCalculator;
import com.serviceops.modules.profitability.service.impl.RevenueRecognitionServiceImpl;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.rate.repository.BillRateRepository;
import com.serviceops.modules.rate.repository.ContractBillRateRepository;
import com.serviceops.modules.rate.repository.WorkTypeRateFactorRepository;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.BillRateService;
import com.serviceops.modules.rate.service.ContractBillRateService;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
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
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Chay {@link RevenueRecognitionServiceImpl} cung {@link RateResolutionServiceImpl} THAT qua proxy giao
 * dich cua Spring (cac unit test khac dung mock nen khong bao gio di qua proxy). Kiem tra dong gio cong
 * thieu don gia (nhan su chua khai bao cap bac) van tra ket qua {@code missingRateData=true} thay vi
 * lam transaction bi danh dau rollback-only roi nem UnexpectedRollbackException (HTTP 500).
 */
@SpringJUnitConfig(RevenueRecognitionTransactionTest.Config.class)
class RevenueRecognitionTransactionTest {

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
		@Bean EmployeeRepository employeeRepository() { return mock(EmployeeRepository.class); }
		@Bean UserRepository userRepository() { return mock(UserRepository.class); }
		@Bean ContractBillRateRepository contractBillRateRepository() { return mock(ContractBillRateRepository.class); }
		@Bean BillRateRepository billRateRepository() { return mock(BillRateRepository.class); }
		@Bean WorkTypeRateFactorRepository workTypeRateFactorRepository() { return mock(WorkTypeRateFactorRepository.class); }
		@Bean AuditLogService auditLogService() { return mock(AuditLogService.class); }
		@Bean EmployeeHourlyRateService employeeHourlyRateService() { return mock(EmployeeHourlyRateService.class); }

		@Bean
		TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
			return new TransactionTemplate(transactionManager);
		}

		@Bean
		EntryMarginCalculator entryMarginCalculator(EmployeeHourlyRateService employeeHourlyRateService,
				ContractBillRateService contractBillRateService, WorkTypeRateService workTypeRateService) {
			return new EntryMarginCalculator(employeeHourlyRateService, contractBillRateService, workTypeRateService);
		}

		@Bean SensitiveAccessLogger sensitiveAccessLogger() { return mock(SensitiveAccessLogger.class); }

		// Service tra don gia THAT (co proxy giao dich) o moi tang: RateResolution -> ContractBillRate -> BillRate.
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
		RevenueRecognitionService revenueRecognitionService(ProjectRepository projectRepository,
				ContractRepository contractRepository, TaskRepository taskRepository,
				TimeEntryRepository timeEntryRepository, EmployeeRepository employeeRepository,
				RateResolutionService rateResolutionService, SensitiveAccessLogger sensitiveAccessLogger) {
			return new RevenueRecognitionServiceImpl(projectRepository, contractRepository, taskRepository,
					timeEntryRepository, employeeRepository, rateResolutionService, sensitiveAccessLogger);
		}
	}

	@Autowired private ProjectRepository projectRepository;
	@Autowired private ContractRepository contractRepository;
	@Autowired private TaskRepository taskRepository;
	@Autowired private TimeEntryRepository timeEntryRepository;
	@Autowired private EmployeeRepository employeeRepository;
	@Autowired private RevenueRecognitionService revenueRecognitionService;
	@Autowired private EntryMarginCalculator entryMarginCalculator;
	@Autowired private EmployeeHourlyRateService employeeHourlyRateService;
	@Autowired private TransactionTemplate transactionTemplate;

	@Test
	@DisplayName("Nhan su chua khai bao cap bac: tra missingRateData=true, khong nem UnexpectedRollbackException")
	void missingLevelDoesNotMarkTransactionRollbackOnly() {
		stubHourlyContractWithOneBillableEntry(null);

		RecognizedRevenueRes result = revenueRecognitionService.calculateRecognizedRevenue(1L);

		assertThat(result.missingRateEntryCount()).isEqualTo(1);
		assertThat(result.totalRecognizedRevenue()).isZero();
		assertThat(result.lines().get(0).missingRateData()).isTrue();
	}

	@Test
	@DisplayName("Co cap bac nhung chua co don gia hieu luc (loi nem tu tang BillRateService): van tra missingRateData=true")
	void missingBillRateDoesNotMarkTransactionRollbackOnly() {
		stubHourlyContractWithOneBillableEntry("Senior");
		when(contractRepository.existsById(5L)).thenReturn(true);
		// contractBillRateRepository / billRateRepository mac dinh tra Optional.empty() -> BillRateServiceImpl nem
		// RESOURCE_NOT_FOUND di qua ba lop proxy giao dich truoc khi RevenueRecognitionServiceImpl bat duoc.

		RecognizedRevenueRes result = revenueRecognitionService.calculateRecognizedRevenue(1L);

		assertThat(result.missingRateEntryCount()).isEqualTo(1);
		assertThat(result.totalRecognizedRevenue()).isZero();
		assertThat(result.lines().get(0).missingRateData()).isTrue();
	}

	@Test
	@DisplayName("Bao cao CN-005/006/007: thieu don gia ban van tra missingRevenue=true, khong nem UnexpectedRollbackException")
	void entryMarginCalculatorSurvivesMissingBillRateInsideTransaction() {
		when(contractRepository.existsById(5L)).thenReturn(true);
		when(employeeHourlyRateService.resolve(10L, LocalDate.of(2026, 6, 30))).thenReturn(
				new ResolvedEmployeeHourlyRateRes(10L, new BigDecimal("250000"), LocalDate.of(2026, 1, 1), false));

		TimeEntry entry = new TimeEntry();
		entry.setId(30L);
		entry.setHours(new BigDecimal("8.00"));
		entry.setWorkDate(LocalDate.of(2026, 6, 30));
		entry.setBillable(true);
		entry.setWorkType(WorkType.NORMAL);
		Employee employee = new Employee();
		employee.setId(10L);
		employee.setProfessionalRole("Lap trinh vien");
		employee.setLevel("Senior");

		// Cac bao cao NCL-09-CN-005/006/007 chay trong transaction cua service bao cao; TransactionTemplate mo phong
		// dung ranh gioi do va commit khi ket thuc - noi UnexpectedRollbackException se bung ra neu bi danh dau rollback-only.
		EntryMarginCalculator.Result result = transactionTemplate.execute(status ->
				entryMarginCalculator.resolve(entry, employee, 5L));

		assertThat(result).isNotNull();
		assertThat(result.missingRevenue()).isTrue();
		assertThat(result.missingCost()).isFalse();
		assertThat(result.cost()).isEqualByComparingTo("2000000.00");
		assertThat(result.revenue()).isZero();
	}

	private void stubHourlyContractWithOneBillableEntry(String employeeLevel) {
		Project project = new Project();
		project.setId(1L);
		project.setContractId(5L);
		Contract contract = new Contract();
		contract.setId(5L);
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		contract.setTotalValue(new BigDecimal("100000000"));
		Task task = new Task();
		task.setId(20L);
		task.setProjectId(1L);
		task.setStatus(TaskStatus.IN_PROGRESS);

		TimeEntry entry = new TimeEntry();
		entry.setId(30L);
		entry.setTaskId(20L);
		entry.setUserId(100L);
		entry.setHours(new BigDecimal("8.00"));
		entry.setWorkDate(LocalDate.of(2026, 6, 30));
		entry.setStatus(TimeEntryStatus.APPROVED);
		entry.setBillable(true);
		entry.setWorkType(WorkType.NORMAL);

		User user = new User();
		user.setId(100L);
		Employee employee = new Employee();
		employee.setId(10L);
		employee.setUser(user);
		employee.setProfessionalRole("Lap trinh vien");
		employee.setLevel(employeeLevel); // null -> RateResolutionServiceImpl nem BusinessRuleException ngay tang tren cung

		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(contractRepository.findById(5L)).thenReturn(Optional.of(contract));
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));
		when(taskRepository.findById(20L)).thenReturn(Optional.of(task));
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(20L),
				TimeEntryStatus.APPROVED)).thenReturn(List.of(entry));
		when(timeEntryRepository.findById(30L)).thenReturn(Optional.of(entry));
		when(employeeRepository.findAllById(any())).thenReturn(List.of(employee));
		when(employeeRepository.findByUser_Id(100L)).thenReturn(Optional.of(employee));
	}
}
