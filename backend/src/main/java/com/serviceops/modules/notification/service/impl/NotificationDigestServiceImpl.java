package com.serviceops.modules.notification.service.impl;

import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.entity.NotificationDigestQueue;
import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationDigestQueueRepository;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationDeduplicationService;
import com.serviceops.modules.notification.service.NotificationDigestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * NCL-14-CN-002 TC-02. Tao thang qua {@link NotificationRepository} (khong di qua
 * {@code NotificationDispatcher}) vi ban tong hop luon phai duoc luu ngay, khong the lai bi gop
 * tiep vao chinh hang doi ma no vua doc.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class NotificationDigestServiceImpl implements NotificationDigestService {

	private final NotificationDigestQueueRepository notificationDigestQueueRepository;
	private final NotificationRepository notificationRepository;
	private final NotificationDeduplicationService notificationDeduplicationService;
	private final Clock clock;

	@Override
	public void runDailyDigest() {
		LocalDateTime cutoff = LocalDateTime.now(clock);
		List<NotificationDigestQueue> pending = notificationDigestQueueRepository.findByCreatedAtBefore(cutoff);
		if (pending.isEmpty()) {
			return;
		}

		LocalDate today = LocalDate.now(clock);
		Map<DigestKey, List<NotificationDigestQueue>> grouped = pending.stream()
				.collect(Collectors.groupingBy(item -> new DigestKey(item.getRecipientId(), item.getNotificationGroup())));

		int digestsSent = 0;
		for (Map.Entry<DigestKey, List<NotificationDigestQueue>> entry : grouped.entrySet()) {
			DigestKey key = entry.getKey();
			String dedupKey = "Digest:" + key.recipientId() + ":" + key.group() + ":" + today;
			if (!notificationDeduplicationService.tryClaim(dedupKey)) {
				continue; // Da gop cho cap nay trong ngay hom nay roi (job chay lai).
			}

			List<NotificationDigestQueue> items = entry.getValue();
			saveDigest(key, items, dedupKey);
			notificationDigestQueueRepository.deleteAll(items);
			digestsSent++;
		}

		if (digestsSent > 0) {
			log.info("Gop thong bao tong hop cuoi ngay: da tao {} ban tong hop tu {} thong bao dang cho",
					digestsSent, pending.size());
		}
	}

	private void saveDigest(DigestKey key, List<NotificationDigestQueue> items, String dedupKey) {
		Notification digest = new Notification();
		digest.setRecipientId(key.recipientId());
		digest.setType(NotificationType.DAILY_DIGEST_SUMMARY);
		digest.setTitle("Tong hop " + items.size() + " thong bao trong ngay (" + key.group() + ")");
		digest.setContent(buildContent(items));
		digest.setChannel(NotificationChannel.IN_APP);
		digest.setReferenceType(dedupKey);
		digest.setSentAt(LocalDateTime.now(clock));
		digest.setIsRead(false);
		notificationRepository.save(digest);
	}

	private static String buildContent(List<NotificationDigestQueue> items) {
		return items.stream()
				.map(item -> "- " + item.getTitle() + (item.getContent() == null || item.getContent().isBlank()
						? ""
						: ": " + item.getContent()))
				.collect(Collectors.joining("\n"));
	}

	private record DigestKey(Long recipientId, NotificationGroup group) {
	}
}
