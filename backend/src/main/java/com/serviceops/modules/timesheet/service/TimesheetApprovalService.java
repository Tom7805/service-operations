package com.serviceops.modules.timesheet.service;

import com.serviceops.modules.timesheet.dto.request.TimesheetApproveReq;
import com.serviceops.modules.timesheet.dto.request.TimesheetRejectReq;
import com.serviceops.modules.timesheet.dto.response.PendingTimesheetRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalHistoryRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetRejectRes;

import java.util.List;

/**
 * Nghiep vu duyet / tu choi bang cham cong (NCL-06-CN-003, NCL-06-CN-004, Epic NCL-06).
 *
 * <p>PM ({@code VT-02}) chi duyet/tu choi duoc cac dong gio cong thuoc du an minh quan
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

	/**
	 * NCL-06-CN-004: tu choi nguyen bang (bo qua {@code entryIds}) hoac tung dong chi dinh
	 * {@code entryIds} — chi tac dong cac dong SUBMITTED thuoc du an cua PM hien tai.
	 * Cac dong bi tu choi quay ve {@code DRAFT} de nguoi nop sua lai; bang chuyen han sang
	 * {@code REJECTED} khi khong con dong SUBMITTED nao (cua bat ky PM nao) sau thao tac nay.
	 */
	TimesheetRejectRes reject(Long timesheetId, TimesheetRejectReq request);

	/**
	 * Lich su cac lan duyet/tu choi GAN NHAT do chinh PM hien tai thuc hien, moi nhat truoc —
	 * lay tu nhat ky thao tac da ghi san khi goi {@link #approve} / {@link #reject}, khong dung
	 * bang du lieu rieng. Dung de PM tra lai "minh vua xu ly cai gi" sau khi bang da roi khoi
	 * hang cho duyet (NCL-06-CN-003/CN-004).
	 *
	 * @param limit so dong toi da tra ve (bi chan trong khoang 1..100).
	 */
	List<TimesheetApprovalHistoryRes> findMyApprovalHistory(int limit);
}
