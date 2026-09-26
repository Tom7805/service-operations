package com.serviceops.modules.notification.enums;

/**
 * Nhom nghiep vu de nguoi dung cau hinh bat/tat va tan suat nhan (NCL-14-CN-002) — gom cac
 * {@link NotificationType} lien quan, tho hon {@link NotificationTargetType} (dung cho dieu huong
 * FE) vi nguoi dung chi can bat/tat theo nghiep vu lon, khong can chi tiet toi tung loai ban ghi.
 */
public enum NotificationGroup {

	TIMESHEET,

	EXPENSE,

	PROJECT,

	CONTRACT,

	INVOICE,

	ACCEPTANCE
}
