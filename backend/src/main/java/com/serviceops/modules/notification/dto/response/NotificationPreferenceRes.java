package com.serviceops.modules.notification.dto.response;

import com.serviceops.modules.notification.enums.NotificationFrequency;
import com.serviceops.modules.notification.enums.NotificationGroup;

public record NotificationPreferenceRes(NotificationGroup notificationGroup, boolean enabled,
		NotificationFrequency frequency) {
}
