package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.project.dto.request.TaskProgressReq;
import com.serviceops.modules.project.dto.response.TaskRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskAssignmentRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.impl.TaskServiceImpl;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-05-CN-004 — Cap nhat tien do cong viec: TC-01 (chuyen trang thai thanh cong),
 * TC-02 (khong phai nguoi phu trach thi bi tu choi), TC-03 (luu lich su thao tac).
 */
@ExtendWith(MockitoExtension.class)
class TaskProgressServiceTest {

	private static final Long PROJECT_ID = 1L;
	private static final Long TASK_ID = 10L;
	private static final Long ASSIGNEE_ID = 101L;

	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private TaskAssignmentRepository assignmentRepository;
	@Mock
	private EmployeeRepository employeeRepository;
	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private ProjectAuditLogger auditLogger;

	private TaskServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new TaskServiceImpl(projectRepository, taskRepository, assignmentRepository, employeeRepository,
				currentUserScopeProvider, auditLogger);

		Project project = new Project();
		project.setId(PROJECT_ID);
		project.setStatus(ProjectStatus.RUNNING);
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
	}

	@Test
	void assigneeCanMoveTaskFromInProgressToDone() {
		Task task = taskInProgress();
		when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
		when(currentUserScopeProvider.currentUserId()).thenReturn(ASSIGNEE_ID);
		when(assignmentRepository.existsByTaskIdAndUserId(TASK_ID, ASSIGNEE_ID)).thenReturn(true);
		when(taskRepository.save(task)).thenReturn(task);

		TaskRes response = service.updateProgress(PROJECT_ID, TASK_ID, new TaskProgressReq(TaskStatus.DONE));

		assertEquals(TaskStatus.DONE, response.status());
		assertEquals(TaskStatus.DONE, task.getStatus());
		verify(auditLogger).recordProgressUpdate(PROJECT_ID, TASK_ID, TaskStatus.IN_PROGRESS, TaskStatus.DONE);
	}

	@Test
	void rejectsUserWhoIsNotAssignedToTheTask() {
		Task task = taskInProgress();
		when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
		when(currentUserScopeProvider.currentUserId()).thenReturn(999L);
		when(assignmentRepository.existsByTaskIdAndUserId(TASK_ID, 999L)).thenReturn(false);

		assertThrows(AccessDeniedException.class,
				() -> service.updateProgress(PROJECT_ID, TASK_ID, new TaskProgressReq(TaskStatus.DONE)));

		assertEquals(TaskStatus.IN_PROGRESS, task.getStatus());
		verify(taskRepository, never()).save(any());
		verify(auditLogger, never()).recordProgressUpdate(any(), any(), any(), any());
	}

	@Test
	void rejectsTaskThatDoesNotBelongToProject() {
		Task task = taskInProgress();
		task.setProjectId(2L);
		when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.updateProgress(PROJECT_ID, TASK_ID, new TaskProgressReq(TaskStatus.DONE)));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}

	private Task taskInProgress() {
		Task task = new Task();
		task.setId(TASK_ID);
		task.setProjectId(PROJECT_ID);
		task.setName("Phong van nguoi dung");
		task.setStatus(TaskStatus.IN_PROGRESS);
		return task;
	}
}
