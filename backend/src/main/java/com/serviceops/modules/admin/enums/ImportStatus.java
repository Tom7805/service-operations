package com.serviceops.modules.admin.enums;

/** Vong doi mot phien nhap du lieu tu tep (NCL-15-CN-004). */
public enum ImportStatus {
	/** Da tai tep len, da kiem tra tung dong, cho quan tri vien xac nhan nhap. */
	PREVIEWED,
	/** Da nhap xong, khong co dong nao that bai. */
	COMMITTED,
	/** Da nhap xong nhung co dong that bai luc ghi — xem danh sach loi de sua lai. */
	COMMITTED_WITH_ERRORS
}
