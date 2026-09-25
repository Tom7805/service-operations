package com.serviceops.modules.notification.service;

public interface NotificationDeduplicationService {

	/**
	 * Co gang "chiem" mot dedup key. Tra ve {@code true} neu day la lan dau (duoc phep xu ly
	 * tiep), {@code false} neu key nay da ton tai (bo qua vi da xu ly roi). Dung cho
	 * {@code NotificationDigestServiceImpl} de tranh gop trung ban tong hop cuoi ngay
	 * (NCL-14-CN-002, QTN-27) khi job chay lai (retry/crash giua chung) trong cung ngay.
	 */
	boolean tryClaim(String dedupKey);
}
