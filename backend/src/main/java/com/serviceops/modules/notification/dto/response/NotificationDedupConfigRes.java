package com.serviceops.modules.notification.dto.response;

import com.serviceops.modules.notification.enums.NotificationType;

import java.time.LocalDateTime;

public record NotificationDedupConfigRes(NotificationType eventType, boolean dedupEnabled, Integer cooldownHours,
		String updatedBy, LocalDateTime updatedAt) {
}
