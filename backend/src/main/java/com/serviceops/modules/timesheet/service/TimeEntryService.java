package com.serviceops.modules.timesheet.service;

import com.serviceops.modules.timesheet.dto.request.TimeEntryCreateReq;
import com.serviceops.modules.timesheet.dto.request.TimeEntryUpdateReq;
import com.serviceops.modules.timesheet.dto.response.TimeEntryRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetSummaryRes;

import java.time.LocalDate;
import java.util.List;

/**
 * Nghiep vu ghi gio cong theo cong viec (NCL-06-CN-001, Epic NCL-06).
 *
 * <p>Nhan vien chuyen mon ({@code VT-03}) chi duoc ghi/sua/xoa gio cong cua
 * chinh minh tren cong viec ma minh dang duoc giao, trong ky cham cong con mo
 * va du an con dang chay.</p>
 */
public interface TimeEntryService {

	/** Ghi gio cong cho mot cong viec trong mot ngay (moi ban ghi la DRAFT). */
	TimeEntryRes create(Long projectId, Long taskId, TimeEntryCreateReq request);

	/** Ghi de so gio va ghi chu cua ban ghi DRAFT cua chinh minh. */
	TimeEntryRes update(Long projectId, Long taskId, Long entryId, TimeEntryUpdateReq request);

	/** Xoa ban ghi gio cong DRAFT cua chinh minh. */
	void delete(Long projectId, Long taskId, Long entryId);

	/** Luoi gio cong tuan cua chinh minh, group theo cong viec, kem canh bao ngan sach (QTN-20). */
	List<TimesheetSummaryRes> findMyWeek(LocalDate weekFrom, LocalDate weekTo);
}
