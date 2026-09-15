package com.serviceops.modules.timesheet.enums;

/**
 * Trang thai ky cham cong (Epic NCL-06 — quan ly day du o story khoa ky cham
 * cong NCL-06-CN-006/VHDV-70; story dieu chinh but toan dao NCL-06-CN-005
 * chi doc trang thai nay de chan dieu chinh vao ky da khoa — TC-03).
 */
public enum PeriodStatus {
	/** Con mo — ghi/duyet/dieu chinh gio cong binh thuong. */
	OPEN,

	/** Da khoa boi ke toan — moi thay doi gio cong trong ky bi chan. */
	LOCKED
}
