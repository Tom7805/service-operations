package com.serviceops.modules.notification.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record NotificationDedupConfigReq(@NotNull Boolean dedupEnabled, @Min(1) Integer cooldownHours) {
}
