package com.serviceops.modules.timesheet.service;

import com.serviceops.modules.timesheet.dto.response.TimesheetRes;

import java.time.LocalDate;

/**
 * Nghiep vu nop bang cham cong tuan (NCL-06-CN-002, Epic NCL-06).
 *
 * <p>Nhan vien chuyen mon ({@code VT-03}) nop bang cham cong cua chinh minh
 * cho mot tuan: he thong kiem tra rang buoc (du dong gio nhap, QTN-14 gioi han
 * 12 gio/ngay), chuyen toan bo dong DRAFT trong tuan sang SUBMITTED va dat
 * bang o trang thai PENDING_APPROVAL cho PM duyet.</p>
 */
public interface TimesheetSubmitService {

	/**
	 * Nop bang cham cong cua chinh minh trong khoang ngay (mot tuan).
	 *
	 * @return bang cham cong o trang thai PENDING_APPROVAL.
	 */
	TimesheetRes submit(LocalDate weekFrom, LocalDate weekTo);
}
