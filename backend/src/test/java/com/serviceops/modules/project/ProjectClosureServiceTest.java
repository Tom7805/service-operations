package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.impl.ProjectClosureServiceImpl;
import com.serviceops.modules.project.validator.ProjectClosureValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-05-CN-006 — Dong du an: TC-01 (moi bang cham cong da duyet thi dong duoc va chot trang
 * thai), TC-02 (con cong viec cho duyet thi chan va liet ke), TC-04 (luu lich su thao tac).
 * TC-03 (khong co quyen) thuoc ve @PreAuthorize o tang controller, khong kiem trong unit test nay.
 */
@ExtendWith(MockitoExtension.class)
class ProjectClosureServiceTest {

	private static final Long PROJECT_ID = 1L;

	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private ProjectAuditLogger auditLogger;

	private ProjectClosureServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ProjectClosureServiceImpl(projectRepository, taskRepository, new ProjectClosureValidator(),
				auditLogger);
	}

	@Test
	void closesRunningProjectWithoutPendingApprovalTasks() {
		Project project = runningProject();
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
		when(taskRepository.findByProjectIdAndStatusOrderByIdAsc(PROJECT_ID, TaskStatus.WAITING_APPROVAL))
				.thenReturn(List.of());
		when(projectRepository.save(project)).thenReturn(project);

		ProjectRes response = service.closeProject(PROJECT_ID);

		assertEquals("CLOSED", response.status());
		assertEquals(ProjectStatus.CLOSED, project.getStatus());
		verify(auditLogger).recordClose(PROJECT_ID, project.getProjectCode());
	}

	@Test
	void rejectsClosingWhileTasksAreWaitingApproval() {
		Project project = runningProject();
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
		Task pending = new Task();
		pending.setId(20L);
		pending.setProjectId(PROJECT_ID);
		pending.setName("Kiem thu module A");
		pending.setStatus(TaskStatus.WAITING_APPROVAL);
		when(taskRepository.findByProjectIdAndStatusOrderByIdAsc(PROJECT_ID, TaskStatus.WAITING_APPROVAL))
				.thenReturn(List.of(pending));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.closeProject(PROJECT_ID));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		assertEquals(ProjectStatus.RUNNING, project.getStatus());
		verify(projectRepository, never()).save(project);
		verify(auditLogger, never()).recordClose(any(), any());
	}

	@Test
	void rejectsClosingAProjectThatIsAlreadyClosed() {
		Project project = runningProject();
		project.setStatus(ProjectStatus.CLOSED);
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.closeProject(PROJECT_ID));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsUnknownProject() {
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.empty());

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.closeProject(PROJECT_ID));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}

	private Project runningProject() {
		Project project = new Project();
		project.setId(PROJECT_ID);
		project.setProjectCode("DA-ABC123");
		project.setStatus(ProjectStatus.RUNNING);
		return project;
	}
}
