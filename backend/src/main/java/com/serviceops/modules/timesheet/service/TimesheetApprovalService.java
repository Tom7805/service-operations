package com.serviceops.modules.timesheet.service;

import com.serviceops.modules.timesheet.dto.request.TimesheetRejectReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;

/** NCL-06-CN-003/004: duyet / tu choi bang cham cong theo tuan. */
public interface TimesheetApprovalService {

	/**
	 * NCL-06-CN-004: tu choi bang cham cong dang cho duyet.
	 *
	 * @param timesheetId bang cham cong can tu choi
	 * @param request     ly do tu choi (bat buoc)
	 * @return bang cham cong sau khi quay ve trang thai nhap (DRAFT)
	 */
	TimesheetRes reject(Long timesheetId, TimesheetRejectReq request);
}
