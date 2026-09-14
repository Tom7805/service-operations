package com.serviceops.modules.timesheet.enums;

/**
 * Trang thai bang cham cong tuan (NCL-06-CN-001..004).
 *
 * <ul>
 *   <li>{@code DRAFT} — dang ghi, nguoi nop con sua duoc tung dong gio cong.</li>
 *   <li>{@code PENDING_APPROVAL} — da nop, cho quan ly du an duyet (NCL-06-CN-002).</li>
 *   <li>{@code APPROVED} — da duyet, gio cong bat bien (NCL-06-CN-003, QTN-10).</li>
 *   <li>{@code REJECTED} — bi tu choi va quay ve DRAFT de sua lai (NCL-06-CN-004);
 *       trang thai nay chi la nhan lich su tuc thoi truoc khi ban ghi tro ve DRAFT.</li>
 * </ul>
 */
public enum TimesheetStatus {
	DRAFT,
	PENDING_APPROVAL,
	APPROVED,
	REJECTED
}
