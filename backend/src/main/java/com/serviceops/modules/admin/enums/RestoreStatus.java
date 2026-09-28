package com.serviceops.modules.admin.enums;

/**
 * Trang thai yeu cau phuc hoi hai buoc (QTN-30): tao yeu cau o buoc 1 ({@link #PENDING}), buoc 2 xac nhan
 * xong thi {@link #COMPLETED} hoac {@link #FAILED}; qua han chua xac nhan thi {@link #EXPIRED}.
 */
public enum RestoreStatus {
	PENDING,
	COMPLETED,
	FAILED,
	EXPIRED
}
