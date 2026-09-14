package com.serviceops.modules.notification.service;

import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.enums.NotificationType;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {

	void sendInAppNotification(Long recipientId, NotificationType type, String title, String content, Long referenceId, String referenceType);

	List<NotificationRes> getUnreadNotifications(Long recipientId);

	List<NotificationRes> listNotifications(Long recipientId, boolean unreadOnly, Pageable pageable);

	void markAsRead(Long recipientId, List<Long> notificationIds);

	long getUnreadCount(Long recipientId);
}