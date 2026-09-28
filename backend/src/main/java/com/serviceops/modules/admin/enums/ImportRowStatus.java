package com.serviceops.modules.admin.enums;

/** Ket qua kiem tra mot dong cua tep nhap (NCL-15-CN-004). */
public enum ImportRowStatus {
	/** Hop le, se duoc tao moi khi xac nhan nhap. */
	VALID,
	/** Sai / thieu du lieu (TC-02) — khong bao gio duoc nhap. */
	INVALID,
	/** Trung ho so da co trong he thong (TC-03) — nguoi dung chon bo qua hoac cap nhat. */
	DUPLICATE
}
