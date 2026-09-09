package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.request.TaskBudgetReq;
import com.serviceops.modules.project.dto.response.TaskBudgetStatusRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.impl.TaskBudgetServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-05-CN-005 — Dat ngan sach gio cong cho cong viec: TC-01 (luu ngan sach, ty le dung bang khong),
 * TC-02 (canh bao khi vuot 80% ngan sach), TC-04 (luu lich su thao tac). TC-03 (khong co quyen) thuoc ve
 * @PreAuthorize o tang controller, khong kiem trong unit test nay.
 */
@ExtendWith(MockitoExtension.class)
class TaskHourBudgetServiceTest {

	private static final Long PROJECT_ID = 1L;
	private static final Long TASK_ID = 10L;

	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private ProjectAuditLogger auditLogger;

	private TaskBudgetServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new TaskBudgetServiceImpl(projectRepository, taskRepository, auditLogger);
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(new Project()));
	}

	@Test
	void savesBudgetAndReportsZeroUsageWhenNoHoursApprovedYet() {
		Task task = taskWithApprovedHours(BigDecimal.ZERO);
		when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
		when(taskRepository.save(task)).thenReturn(task);

		TaskBudgetStatusRes response = service.setBudget(PROJECT_ID, TASK_ID,
				new TaskBudgetReq(new BigDecimal("40")));

		assertEquals(new BigDecimal("40"), task.getBudgetHours());
		assertEquals(0, response.usageRatio().compareTo(BigDecimal.ZERO));
		assertFalse(response.overBudgetWarning());
		verify(auditLogger).recordBudgetUpdate(PROJECT_ID, TASK_ID, null, new BigDecimal("40"));
	}

	@Test
	void warnsWhenApprovedHoursReachEightyPercentOfBudget() {
		Task task = taskWithApprovedHours(new BigDecimal("34"));
		task.setBudgetHours(new BigDecimal("40"));
		when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
		when(taskRepository.save(task)).thenReturn(task);

		TaskBudgetStatusRes response = service.setBudget(PROJECT_ID, TASK_ID,
				new TaskBudgetReq(new BigDecimal("40")));

		assertEquals(0, response.usageRatio().compareTo(new BigDecimal("0.85")));
		assertTrue(response.overBudgetWarning());
	}

	@Test
	void rejectsTaskThatDoesNotBelongToProject() {
		Task task = taskWithApprovedHours(BigDecimal.ZERO);
		task.setProjectId(2L);
		when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.setBudget(PROJECT_ID, TASK_ID, new TaskBudgetReq(new BigDecimal("40"))));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}

	private Task taskWithApprovedHours(BigDecimal approvedHours) {
		Task task = new Task();
		task.setId(TASK_ID);
		task.setProjectId(PROJECT_ID);
		task.setName("Trien khai module A");
		task.setApprovedHours(approvedHours);
		return task;
	}
}
