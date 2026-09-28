package com.serviceops.modules.timesheet.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import org.springframework.stereotype.Component;

/**
 * Chan ghi gio cong vao du an da dong (NCL-06-CN-007 "Chan ghi gio vao du an
 * da dong", quy tac QTN-13; hien thuc lan dau boi story VHDV-76, ke thua cho
 * story ghi gio theo cong viec NCL-06-CN-001). Du an chi nhan gio cong khi
 * dang {@link ProjectStatus#RUNNING}.
 */
@Component
public class OpenProjectValidator {

	/**
	 * @param project du an cua cong viec duoc ghi gio cong.
	 * @throws BusinessRuleException INVALID_STATE neu du an khong o trang thai RUNNING.
	 */
	public void validate(Project project) {
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the ghi gio cong cho du an da dong");
		}
	}
}
