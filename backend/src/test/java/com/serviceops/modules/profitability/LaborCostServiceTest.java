package com.serviceops.modules.profitability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.service.impl.LaborCostServiceImpl;
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

@ExtendWith(MockitoExtension.class)
class LaborCostServiceTest {

	@Mock private ProjectRepository projectRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private EmployeeHourlyRateService employeeHourlyRateService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	private LaborCostServiceImpl service;
	private Employee employee;

	@BeforeEach
	void setUp() {
		service = new LaborCostServiceImpl(projectRepository, taskRepository, timeEntryRepository,
				employeeRepository, employeeHourlyRateService, sensitiveAccessLogger);
		employee = new Employee();
		employee.setId(10L);
		User user = new User();
		user.setId(100L);
		employee.setUser(user);
		when(employeeRepository.findAllById(List.of(100L))).thenReturn(List.of(employee));
	}

	@Test
	void calculatesApprovedHoursUsingRateEffectiveOnWorkDate() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(new Project()));
		Task task = new Task();
		task.setId(20L);
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));
		TimeEntry entry = entry(100L, new BigDecimal("8.00"), LocalDate.of(2026, 1, 15));
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(20L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(entry));
		when(employeeHourlyRateService.resolve(10L, entry.getWorkDate()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(10L, new BigDecimal("250000.00"),
						LocalDate.of(2026, 1, 1), false));

		ProjectLaborCostRes result = service.calculateProjectLaborCost(1L);

		assertThat(result.totalApprovedHours()).isEqualByComparingTo("8.00");
		assertThat(result.totalLaborCost()).isEqualByComparingTo("2000000.00");
		assertThat(result.missingCostEntryCount()).isZero();
		assertThat(result.lines()).hasSize(1);
	}

	@Test
	void excludesEntryFromCostWhenEffectiveRateIsMissingButReportsIt() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(new Project()));
		Task task = new Task();
		task.setId(20L);
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task));
		TimeEntry entry = entry(100L, new BigDecimal("4.00"), LocalDate.of(2025, 12, 1));
		when(timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(List.of(20L), TimeEntryStatus.APPROVED))
				.thenReturn(List.of(entry));
		when(employeeHourlyRateService.resolve(10L, entry.getWorkDate()))
				.thenReturn(new ResolvedEmployeeHourlyRateRes(10L, null, null, true));

		ProjectLaborCostRes result = service.calculateProjectLaborCost(1L);

		assertThat(result.totalApprovedHours()).isEqualByComparingTo("4.00");
		assertThat(result.totalLaborCost()).isZero();
		assertThat(result.missingCostEntryCount()).isOne();
		assertThat(result.lines().get(0).missingCostData()).isTrue();
	}

	private TimeEntry entry(Long userId, BigDecimal hours, LocalDate workDate) {
		TimeEntry entry = new TimeEntry();
		entry.setId(30L);
		entry.setUserId(userId);
		entry.setHours(hours);
		entry.setWorkDate(workDate);
		entry.setStatus(TimeEntryStatus.APPROVED);
		return entry;
	}
}
