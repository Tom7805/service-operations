package com.serviceops.modules.notification.dto.request;

import com.serviceops.modules.notification.enums.NotificationFrequency;
import com.serviceops.modules.notification.enums.NotificationGroup;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record NotificationPreferenceReq(@NotEmpty @Valid List<Item> preferences) {

	public record Item(@NotNull NotificationGroup notificationGroup, boolean enabled,
			@NotNull NotificationFrequency frequency) {
	}
}
