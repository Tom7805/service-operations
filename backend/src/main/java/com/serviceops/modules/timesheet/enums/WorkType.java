package com.serviceops.modules.timesheet.enums;

/**
 * Loai hinh cong viec cua mot dong gio cong (NCL-07-CN-006).
 *
 * <p>Dung de tra he so nhan don gia ({@code WorkTypeRateFactor}) ap len don gia
 * theo vai tro/cap bac (BillRate/ContractBillRate) khi tinh don gia cuoi cung
 * cho mot dong gio cong cu the (NCL-07-CN-005). Ban ghi moi mac dinh {@link #NORMAL}
 * neu nguoi ghi khong chon loai hinh khac.</p>
 */
public enum WorkType {
	/** Gio hanh chinh binh thuong — he so mac dinh 1.00. */
	NORMAL,

	/** Gio ngoai gio hanh chinh trong ngay thuong. */
	OVERTIME,

	/** Gio lam vao ngay nghi hang tuan (Thu 7/Chu nhat). */
	WEEKEND,

	/** Gio lam vao ngay le/Tet. */
	HOLIDAY
}
