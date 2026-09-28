package com.serviceops.modules.expense.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import org.springframework.stereotype.Component;

@Component
public class ExpenseProjectStateValidator {

	public void validate(Project project) {
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the ghi nhan chi phi cho du an da dong");
		}
	}
}
