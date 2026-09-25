package com.serviceops.scheduler;

import com.serviceops.modules.notification.service.NotificationDigestService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * NCL-14-CN-002 TC-02: cuoi moi ngay, gop cac thong bao dang cho trong hang doi tong hop
 * (nguoi dung chon nhan theo tan suat DAILY_DIGEST) thanh mot ban tong hop duy nhat cho moi
 * (nguoi nhan, nhom thong bao).
 */
@Component
@RequiredArgsConstructor
public class NotificationDigestJob {

	private final NotificationDigestService notificationDigestService;

	@Scheduled(cron = "0 0 20 * * *")
	public void runDailyDigest() {
		notificationDigestService.runDailyDigest();
	}
}
