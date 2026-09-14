package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.request.TaskCreateReq;
import com.serviceops.modules.project.dto.request.WorkPackageReq;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import com.serviceops.modules.project.service.impl.WorkPackageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskBudgetServiceTest {
	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private WorkPackageRepository workPackageRepository;
	@Mock
	private TaskRepository taskRepository;

	private WorkPackageServiceImpl service;
	private Project project;

	@BeforeEach
	void setUp() {
		service = new WorkPackageServiceImpl(projectRepository, workPackageRepository, taskRepository);
		project = new Project();
		project.setId(1L);
		project.setStatus(ProjectStatus.RUNNING);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
	}

	@Test
	void createsRootWorkPackageWithTrimmedName() {
		when(workPackageRepository.save(any(WorkPackage.class))).thenAnswer(invocation -> {
			WorkPackage saved = invocation.getArgument(0);
			saved.setId(10L);
			return saved;
		});

		var response = service.createWorkPackage(1L, new WorkPackageReq(null, "  Phan tich  ", "Mo ta", 1));

		assertEquals(10L, response.id());
		assertEquals("Phan tich", response.name());
		assertEquals(1L, response.id() == 10L ? project.getId() : null);
	}

	@Test
	void rejectsTaskWhenExpectedEndPrecedesStart() {
		WorkPackage workPackage = new WorkPackage();
		workPackage.setId(10L);
		workPackage.setProjectId(1L);
		when(workPackageRepository.findById(10L)).thenReturn(Optional.of(workPackage));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.createTask(1L, 10L,
						new TaskCreateReq(null, "Task", null,
								LocalDate.of(2026, 9, 12), LocalDate.of(2026, 9, 10))));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsChangesToClosedProject() {
		project.setStatus(ProjectStatus.CLOSED);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.createWorkPackage(1L, new WorkPackageReq(null, "Ke hoach", null, null)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void createsNestedTaskOnlyInsideItsWorkPackage() {
		WorkPackage workPackage = new WorkPackage();
		workPackage.setId(10L);
		workPackage.setProjectId(1L);
		when(workPackageRepository.findById(10L)).thenReturn(Optional.of(workPackage));
		Task parent = new Task();
		parent.setId(20L);
		parent.setProjectId(1L);
		parent.setWorkPackageId(10L);
		when(taskRepository.findById(20L)).thenReturn(Optional.of(parent));
		when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
			Task saved = invocation.getArgument(0);
			saved.setId(21L);
			return saved;
		});

		var response = service.createTask(1L, 10L,
				new TaskCreateReq(20L, "Task con", "Chi tiet", null, null));

		assertEquals(21L, response.id());
		assertEquals(20L, response.parentTaskId());
	}
}
