package com.serviceops.modules.timesheet.service;

import com.serviceops.modules.timesheet.dto.request.TimeEntryAdjustmentReq;
import com.serviceops.modules.timesheet.dto.response.AdjustmentTraceRes;

import java.util.List;

/**
 * NCL-06-CN-005: dieu chinh mot dong gio cong da duyet bang but toan dao (QTN-11).
 *
 * <p>PM ({@code VT-02}) chi dieu chinh duoc dong thuoc du an minh quan ly, giong quy tac
 * "chi duyet/tu choi entry thuoc du an minh quan ly" cua NCL-06-CN-003/004.</p>
 */
public interface TimesheetAdjustmentService {

	/**
	 * Dieu chinh mot dong gio cong da duyet: sinh dong dao (am gio) va dong sua (gio dung),
	 * dong goc giu nguyen. Chi tac dong dong o trang thai {@code APPROVED} va thuoc ky cham
	 * cong con mo (TC-01, TC-03).
	 */
	AdjustmentTraceRes adjust(Long projectId, Long taskId, Long entryId, TimeEntryAdjustmentReq request);

	/** Lich su dieu chinh cua mot cong viec — moi nhat truoc ("tra cuu duoc"). */
	List<AdjustmentTraceRes> findHistory(Long projectId, Long taskId);
}
