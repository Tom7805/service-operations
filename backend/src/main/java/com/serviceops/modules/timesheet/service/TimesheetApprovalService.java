package com.serviceops.modules.timesheet.service;

import com.serviceops.modules.timesheet.dto.request.TimesheetApproveReq;
import com.serviceops.modules.timesheet.dto.response.PendingTimesheetRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalRes;

import java.util.List;

/**
 * Nghiep vu duyet bang cham cong (NCL-06-CN-003, Epic NCL-06).
 *
 * <p>PM ({@code VT-02}) chi duyet duoc cac dong gio cong thuoc du an minh quan
 * ly (TC-02); dong duyet chuyen {@code SUBMITTED} → {@code APPROVED} va cong
 * vao {@code approvedHours} cua cong viec (QTN-10: gio da duyet bat bien).</p>
 */
public interface TimesheetApprovalService {

	/** Hang cho duyet cua PM hien tai: bang co it nhat mot dong pending thuoc du an minh quan ly. */
	List<PendingTimesheetRes> findPending();

	/**
	 * Duyet nguyen bang (bo qua {@code entryIds}) hoac tung dong chi dinh
	 * {@code entryIds} — chi tac dong cac dong thuoc du an cua PM hien tai.
	 */
	TimesheetApprovalRes approve(Long timesheetId, TimesheetApproveReq request);
}
