package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.request.TaskBudgetReq;
import com.serviceops.modules.project.dto.response.TaskBudgetStatusRes;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.TaskBudgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskBudgetServiceImpl implements TaskBudgetService {

	/** QTN-20: canh bao khi gio cong da duyet dat tu 80% ngan sach tro len. */
	private static final BigDecimal WARNING_THRESHOLD = new BigDecimal("0.80");

	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final ProjectAuditLogger auditLogger;

	@Override
	public TaskBudgetStatusRes setBudget(Long projectId, Long taskId, TaskBudgetReq request) {
		projectRepository.findById(projectId).orElseThrow(() -> notFound("Khong tim thay du an"));
		Task task = taskRepository.findById(taskId)
				.filter(item -> item.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay cong viec thuoc du an"));

		BigDecimal previousBudget = task.getBudgetHours();
		task.setBudgetHours(request.budgetHours());
		Task saved = taskRepository.save(task);

		auditLogger.recordBudgetUpdate(projectId, saved.getId(), previousBudget, saved.getBudgetHours());

		return toStatus(saved);
	}

	private TaskBudgetStatusRes toStatus(Task task) {
		BigDecimal approvedHours = task.getApprovedHours() == null ? BigDecimal.ZERO : task.getApprovedHours();
		BigDecimal usageRatio = approvedHours.divide(task.getBudgetHours(), 4, RoundingMode.HALF_UP);
		boolean overBudget = usageRatio.compareTo(WARNING_THRESHOLD) >= 0;
		return new TaskBudgetStatusRes(task.getId(), task.getProjectId(), task.getBudgetHours(), approvedHours,
				usageRatio, overBudget);
	}

	private BusinessRuleException notFound(String message) {
		return new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, message);
	}
}
