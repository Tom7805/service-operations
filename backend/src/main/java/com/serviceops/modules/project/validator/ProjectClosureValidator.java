package com.serviceops.modules.project.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Kiem tra dieu kien dong du an (NCL-05-CN-006, TC-01/TC-02, QTN-13). Chi du an dang
 * {@code RUNNING} va khong con cong viec o trang thai {@code WAITING_APPROVAL} (dai dien cho
 * bang cham cong con treo chua duyet — Epic NCL-06 chua trien khai nen chua co bang cham cong
 * that) moi duoc dong.
 */
@Component
public class ProjectClosureValidator {

	public void validate(Project project, List<Task> pendingApprovalTasks) {
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Du an khong o trang thai dang chay");
		}
		if (!pendingApprovalTasks.isEmpty()) {
			String pendingList = pendingApprovalTasks.stream()
					.map(task -> "#" + task.getId() + " " + task.getName())
					.collect(Collectors.joining(", "));
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Con cong viec dang cho duyet, chua the dong du an: " + pendingList);
		}
	}
}
