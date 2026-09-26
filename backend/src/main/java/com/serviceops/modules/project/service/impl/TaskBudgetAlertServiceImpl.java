package com.serviceops.modules.project.service.impl;

import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationAntiDuplicateService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.TaskBudgetAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskBudgetAlertServiceImpl implements TaskBudgetAlertService {

	/** QTN-20: canh bao khi gio cong da duyet dat tu 80% ngan sach tro len. */
	static final BigDecimal WARNING_THRESHOLD = new BigDecimal("0.80");

	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final NotificationAntiDuplicateService notificationAntiDuplicateService;
	private final PlatformTransactionManager transactionManager;

	@Override
	public List<Long> evaluate(Task task) {
		if (task.getBudgetHours() == null || task.getBudgetHours().signum() <= 0) {
			return List.of();
		}
		BigDecimal approved = task.getApprovedHours() == null ? BigDecimal.ZERO : task.getApprovedHours();
		BigDecimal ratio = approved.divide(task.getBudgetHours(), 4, RoundingMode.HALF_UP);
		boolean breached = ratio.compareTo(WARNING_THRESHOLD) >= 0;
		Long pmId = projectRepository.findById(task.getProjectId()).map(Project::getProjectManagerId).orElse(null);
		List<Long> candidates = pmId == null ? List.of() : List.of(pmId);

		return notificationAntiDuplicateService.evaluateAndNotify(NotificationType.TASK_BUDGET_EXCEEDED, task.getId(),
				candidates, breached, "Cong viec vuot nguong ngan sach gio cong",
				"Cong viec #" + task.getId() + " " + task.getName() + " da dung " + approved + "/"
						+ task.getBudgetHours() + " gio (" + ratio.movePointRight(2).stripTrailingZeros().toPlainString()
						+ "% ngan sach), vuot nguong 80% (QTN-20)");
	}

	@Override
	public void evaluateAfterCommit(Collection<Long> taskIds) {
		if (taskIds == null || taskIds.isEmpty()) {
			return;
		}
		List<Long> ids = List.copyOf(taskIds);
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					runInNewTransaction(ids);
				}
			});
		} else {
			runInNewTransaction(ids);
		}
	}

	private void runInNewTransaction(List<Long> taskIds) {
		TransactionTemplate template = new TransactionTemplate(transactionManager);
		template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
		for (Long taskId : taskIds) {
			try {
				template.executeWithoutResult(status -> taskRepository.findById(taskId).ifPresent(this::evaluate));
			} catch (RuntimeException ex) {
				// Viec duyet da commit; loi canh bao chi ghi log — tac vu nen se thu lai o lan quet ke tiep.
				log.warn("Khong gui duoc canh bao vuot ngan sach cho cong viec #{}: {}", taskId, ex.getMessage());
			}
		}
	}
}
