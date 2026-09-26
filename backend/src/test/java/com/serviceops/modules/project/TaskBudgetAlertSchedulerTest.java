package com.serviceops.modules.project;

import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationAntiDuplicateService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.scheduler.TaskBudgetAlertScheduler;
import com.serviceops.modules.project.service.impl.TaskBudgetAlertServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** NCL-14-CN-003 / QTN-20: danh gia vuot ngan sach di qua co che chong gui trung, dung chung cho job va luong duyet. */
@ExtendWith(MockitoExtension.class)
class TaskBudgetAlertSchedulerTest {

	@Mock
	private TaskRepository taskRepository;
	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private NotificationAntiDuplicateService antiDuplicateService;
	@Mock
	private PlatformTransactionManager transactionManager;

	private TaskBudgetAlertServiceImpl alertService;
	private TaskBudgetAlertScheduler scheduler;

	@BeforeEach
	void setUp() {
		alertService = new TaskBudgetAlertServiceImpl(taskRepository, projectRepository, antiDuplicateService,
				transactionManager);
		scheduler = new TaskBudgetAlertScheduler(taskRepository, alertService);
	}

	private Task task(long id, String budget, String approved) {
		Task task = new Task();
		task.setId(id);
		task.setProjectId(1L);
		task.setName("Task " + id);
		task.setBudgetHours(budget == null ? null : new BigDecimal(budget));
		task.setApprovedHours(new BigDecimal(approved));
		return task;
	}

	private void pmOfProject(long pmId) {
		Project project = new Project();
		project.setId(1L);
		project.setProjectManagerId(pmId);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
	}

	@Test
	void job_vuotNguong80_breachedTrueChoPm_duoiNguong_breachedFalse() {
		pmOfProject(7L);
		when(taskRepository.findBudgetedTasksOfProjectsInStatus(ProjectStatus.RUNNING))
				.thenReturn(List.of(task(11L, "40", "34"), task(12L, "40", "10")));
		when(antiDuplicateService.evaluateAndNotify(any(), any(), anyList(), eq(true), anyString(), anyString()))
				.thenReturn(List.of(7L));

		scheduler.scanTaskBudgets();

		verify(antiDuplicateService).evaluateAndNotify(eq(NotificationType.TASK_BUDGET_EXCEEDED), eq(11L),
				eq(List.of(7L)), eq(true), anyString(), anyString());
		verify(antiDuplicateService).evaluateAndNotify(eq(NotificationType.TASK_BUDGET_EXCEEDED), eq(12L),
				eq(List.of(7L)), eq(false), anyString(), anyString());
	}

	@Test
	void evaluate_congViecKhongCoNganSach_khongGoiChongTrung() {
		alertService.evaluate(task(13L, null, "50"));

		verify(antiDuplicateService, never()).evaluateAndNotify(any(), any(), anyList(), eq(true), anyString(),
				anyString());
	}

	@Test
	void evaluateAfterCommit_loiCanhBao_khongNemRaNgoai() {
		// Khong co giao dich dang chay (unit test) -> chay ngay; transactionManager mock tra null
		// nen TransactionTemplate nem loi — phai bi nuot, khong lam hong viec duyet.
		alertService.evaluateAfterCommit(List.of(11L));
	}
}
