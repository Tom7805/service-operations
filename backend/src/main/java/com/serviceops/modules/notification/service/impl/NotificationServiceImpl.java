package com.serviceops.modules.notification.service.impl;

import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.mapper.NotificationMapper;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

	private final NotificationRepository notificationRepository;
	private final NotificationMapper notificationMapper;

	@Override
	public void sendInAppNotification(Long recipientId, NotificationType type, String title, String content, Long referenceId, String referenceType) {
		Notification notification = new Notification();
		notification.setRecipientId(recipientId);
		notification.setType(type);
		notification.setTitle(title);
		notification.setContent(content);
		notification.setChannel(NotificationChannel.IN_APP);
		notification.setReferenceId(referenceId);
		notification.setReferenceType(referenceType);
		notification.setSentAt(LocalDateTime.now());
		notification.setIsRead(false);
		notificationRepository.save(notification);
	}

	@Override
	public List<NotificationRes> getUnreadNotifications(Long recipientId) {
		return notificationRepository.findByRecipientIdAndIsReadFalseOrderBySentAtDesc(recipientId)
				.stream()
				.map(notificationMapper::toResponse)
				.toList();
	}

	@Override
	public void markAsRead(Long recipientId, List<Long> notificationIds) {
		List<Notification> notifications = notificationRepository.findAllById(notificationIds);
		for (Notification notification : notifications) {
			if (notification.getRecipientId().equals(recipientId)) {
				notification.setIsRead(true);
				notification.setReadAt(LocalDateTime.now());
			}
		}
		notificationRepository.saveAll(notifications);
	}

	@Override
	public long getUnreadCount(Long recipientId) {
		return notificationRepository.countUnreadByRecipientId(recipientId);
	}
}