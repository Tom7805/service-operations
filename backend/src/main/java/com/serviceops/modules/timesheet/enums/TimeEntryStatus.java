package com.serviceops.modules.timesheet.enums;

/**
 * Trang thai ban ghi gio cong (NCL-06-CN-001, Epic NCL-06).
 *
 * <p>Moi ban ghi khoi tao o {@link #DRAFT} — nguoi duoc giao cong viec ghi va
 * co the sua/xoa trong ky cham cong con mo. Gio cong chi duoc cong vao
 * {@code approved_hours} cua cong viec sau khi di qua luong nop/duyet bang
 * cham cong tuan (cac story VHDV-86/VHDV-84).</p>
 */
public enum TimeEntryStatus {

	/** Ban ghi nhap, nguoi ghi con co the sua hoac xoa. */
	DRAFT,

	/** Da nop trong bang cham cong tuan, cho PM duyet. */
	SUBMITTED,

	/** Da duoc PM duyet — gio cong tinh vao approved_hours cua cong viec. */
	APPROVED,

	/** Bi PM tu choi khi duyet bang cham cong tuan. */
	REJECTED
}
