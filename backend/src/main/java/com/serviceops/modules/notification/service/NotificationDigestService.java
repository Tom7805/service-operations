package com.serviceops.modules.notification.service;

public interface NotificationDigestService {

	/**
	 * Gop cac thong bao dang cho trong hang doi tong hop theo tung (recipientId,
	 * notificationGroup), tao mot Notification tong hop duy nhat cho moi cap, roi xoa cac item
	 * da gop khoi hang doi (NCL-14-CN-002 TC-02). Duoc {@code NotificationDigestJob} goi moi
	 * ngay; idempotent trong cung ngay nho {@link NotificationDeduplicationService}.
	 */
	void runDailyDigest();
}
