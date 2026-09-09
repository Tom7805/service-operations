package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.project.dto.request.TaskAssignmentReq;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.TaskAssignment;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskAssignmentRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.impl.TaskServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskAssignmentServiceTest {
	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private TaskAssignmentRepository assignmentRepository;
	@Mock
	private EmployeeRepository employeeRepository;

	private TaskServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new TaskServiceImpl(projectRepository, taskRepository, assignmentRepository, employeeRepository);
		Project project = new Project();
		project.setId(1L);
		project.setStatus(ProjectStatus.RUNNING);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

		Task task = new Task();
		task.setId(10L);
		task.setProjectId(1L);
		when(taskRepository.findById(10L)).thenReturn(Optional.of(task));
	}

	@Test
	void assignsMultipleActiveEmployeesAndReplacesPreviousAssignments() {
		User first = activeUser(101L, "dev01", "Dev One");
		User second = activeUser(102L, "dev02", "Dev Two");
		when(employeeRepository.findByUser_Id(101L)).thenReturn(Optional.of(employee(first)));
		when(employeeRepository.findByUser_Id(102L)).thenReturn(Optional.of(employee(second)));
		when(assignmentRepository.saveAll(anyList())).thenAnswer(invocation -> {
			List<TaskAssignment> saved = invocation.getArgument(0);
			saved.get(0).setId(201L);
			saved.get(1).setId(202L);
			return saved;
		});

		var response = service.assign(1L, 10L,
				new TaskAssignmentReq(List.of(101L, 102L), LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 12)));

		assertEquals(List.of(101L, 102L), response.stream().map(item -> item.userId()).toList());
		assertEquals("dev01", response.get(0).username());
		verify(assignmentRepository).deleteByTaskId(10L);
	}

	@Test
	void rejectsEmployeeWhoseEmploymentHasEnded() {
		User user = activeUser(101L, "dev01", "Dev One");
		Employee employee = employee(user);
		employee.setEndDate(LocalDate.now().minusDays(1));
		when(employeeRepository.findByUser_Id(101L)).thenReturn(Optional.of(employee));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.assign(1L, 10L, new TaskAssignmentReq(List.of(101L), null, null)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsTaskFromAnotherProject() {
		Task task = new Task();
		task.setId(10L);
		task.setProjectId(2L);
		when(taskRepository.findById(10L)).thenReturn(Optional.of(task));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.assign(1L, 10L, new TaskAssignmentReq(List.of(101L), null, null)));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}

	private Employee employee(User user) {
		Employee employee = new Employee();
		employee.setUser(user);
		employee.setHireDate(LocalDate.of(2026, 1, 1));
		return employee;
	}

	private User activeUser(Long id, String username, String fullName) {
		User user = new User();
		user.setId(id);
		user.setUsername(username);
		user.setFullName(fullName);
		user.setStatus(UserStatus.ACTIVE);
		return user;
	}
}
