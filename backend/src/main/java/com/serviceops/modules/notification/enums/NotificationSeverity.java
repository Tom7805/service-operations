package com.serviceops.modules.notification.enums;

/**
 * Muc do cua thong bao de trung tam thong bao phan loai/to mau (NCL-14-CN-001 — "phan loai theo
 * muc do"). Suy ra tu {@link NotificationType#severity()} nen ap dung duoc ca cho du lieu cu.
 */
public enum NotificationSeverity {

	/** Thong tin, khong can xu ly gap. */
	INFO,

	/** Can nguoi nhan hanh dong (duyet, nop, kiem tra). */
	WARNING,

	/** Rui ro tai chinh/tien do — can xu ly ngay. */
	CRITICAL
}
