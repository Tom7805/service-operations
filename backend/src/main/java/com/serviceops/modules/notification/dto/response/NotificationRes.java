package com.serviceops.modules.notification.dto.response;

import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationType;

import java.time.LocalDateTime;

public record NotificationRes(Long id, Long recipientId, NotificationType type, String title, String content,
		NotificationChannel channel, Long referenceId, String referenceType, Boolean isRead, LocalDateTime readAt,
		LocalDateTime sentAt) {
}