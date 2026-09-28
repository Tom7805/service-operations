package com.serviceops.modules.timesheet.service;

import java.time.LocalDate;
import java.util.List;

/**
 * Nhac nop bang cham cong (NCL-06-CN-009, Epic NCL-06).
 */
public interface TimesheetReminderService {

	/**
	 * Danh sach userId con dong gio cong DRAFT trong tuan nhung chua nop bang
	 * cham cong (chua co Timesheet o trang thai PENDING_APPROVAL/APPROVED cho
	 * tuan do).
	 */
	List<Long> findUnsubmittedUserIds(LocalDate weekFrom, LocalDate weekTo);

	/**
	 * Gui nhac (in-app) cho tung nhan su con chua nop, va mot ban tong hop cho
	 * PM cua ho. Idempotent theo QTN-27: goi lai nhieu lan trong cung tuan
	 * khong gui trung.
	 *
	 * @return so luong nhan su vua duoc nhac (khong tinh nguoi da duoc nhac tu truoc)
	 */
	int sendReminders(LocalDate weekFrom, LocalDate weekTo);
}
