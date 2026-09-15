package com.serviceops.modules.timesheet.enums;

/**
 * Trang thai bang cham cong tuan (NCL-06-CN-002, Epic NCL-06).
 *
 * <p>Bang tao khi nhan su nop tuan — toan bo dong gio cong DRAFT trong tuan
 * chuyen sang {@link TimeEntryStatus#SUBMITTED} cung luc, bang o trang thai
 * {@link #PENDING_APPROVAL} cho PM duyet (cac story duyet/tu choi sau).</p>
 */
public enum TimesheetStatus {

	/** Da nop, cho PM duyet — nhan su khong sua duoc gio cong trong tuan. */
	PENDING_APPROVAL,

	/** PM da duyet — tong gio cong cong vao approved_hours cua cac cong viec. */
	APPROVED,

	/** PM tu choi — nhan su sua gio cong roi nop lai. */
	REJECTED
}
