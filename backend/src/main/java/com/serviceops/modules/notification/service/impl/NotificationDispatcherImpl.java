package com.serviceops.modules.notification.service.impl;

import com.serviceops.modules.notification.dto.response.NotificationPreferenceRes;
import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.entity.NotificationDigestQueue;
import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationFrequency;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationDigestQueueRepository;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationDispatcher;
import com.serviceops.modules.notification.service.NotificationPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationDispatcherImpl implements NotificationDispatcher {

	private final NotificationPreferenceService notificationPreferenceService;
	private final NotificationRepository notificationRepository;
	private final NotificationDigestQueueRepository notificationDigestQueueRepository;
	private final Clock clock;

	@Override
	public void dispatch(Long recipientId, NotificationType type, String title, String content, Long referenceId,
			String referenceType) {
		NotificationGroup group = type.group();
		NotificationPreferenceRes preference = group == null
				? new NotificationPreferenceRes(null, true, NotificationFrequency.IMMEDIATE)
				: notificationPreferenceService.resolve(recipientId, group);

		if (!preference.enabled()) {
			return; // TC-01: nhom bi tat -> khong luu ban ghi nao ca.
		}

		if (preference.frequency() == NotificationFrequency.DAILY_DIGEST) {
			queueForDigest(recipientId, group, type, title, content, referenceId, referenceType);
			return;
		}

		saveImmediately(recipientId, type, title, content, referenceId, referenceType);
	}

	private void saveImmediately(Long recipientId, NotificationType type, String title, String content,
			Long referenceId, String referenceType) {
		Notification notification = new Notification();
		notification.setRecipientId(recipientId);
		notification.setType(type);
		notification.setTitle(title);
		notification.setContent(content);
		notification.setChannel(NotificationChannel.IN_APP);
		notification.setReferenceId(referenceId);
		notification.setReferenceType(referenceType);
		notification.setSentAt(LocalDateTime.now(clock));
		notification.setIsRead(false);
		notificationRepository.save(notification);
	}

	private void queueForDigest(Long recipientId, NotificationGroup group, NotificationType type, String title,
			String content, Long referenceId, String referenceType) {
		NotificationDigestQueue queued = new NotificationDigestQueue();
		queued.setRecipientId(recipientId);
		queued.setNotificationGroup(group);
		queued.setType(type);
		queued.setTitle(title);
		queued.setContent(content);
		queued.setReferenceId(referenceId);
		queued.setReferenceType(referenceType);
		queued.setCreatedAt(LocalDateTime.now(clock));
		notificationDigestQueueRepository.save(queued);
	}
}
