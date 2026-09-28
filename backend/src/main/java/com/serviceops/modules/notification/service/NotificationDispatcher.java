package com.serviceops.modules.notification.service;

import com.serviceops.modules.notification.enums.NotificationType;

/**
 * Diem chan (gate) duy nhat truoc khi mot thong bao in-app duoc luu, ap dung cau hinh nhan thong
 * bao cua nguoi nhan (NCL-14-CN-002). Duoc {@code NotificationServiceImpl#sendInAppNotification}
 * goi cho toan bo cac noi gui thong bao hien co (timesheet/invoice/profitability/portal...) ma
 * khong can sua tung noi goi.
 */
public interface NotificationDispatcher {

	/**
	 * Tra cau hinh nhom tuong ung voi {@code type} ({@link NotificationType#group()}):
	 * <ul>
	 *   <li>Nhom bi tat -> khong luu gi ca (TC-01).</li>
	 *   <li>Nhom bat, tan suat IMMEDIATE (hoac type khong thuoc nhom nao) -> luu ngay vao
	 *       {@code notifications} nhu truoc gio.</li>
	 *   <li>Nhom bat, tan suat DAILY_DIGEST -> ghi vao hang doi tong hop, cho
	 *       {@code NotificationDigestJob} gop cuoi ngay (TC-02).</li>
	 * </ul>
	 */
	void dispatch(Long recipientId, NotificationType type, String title, String content, Long referenceId,
			String referenceType);
}
