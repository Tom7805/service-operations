package com.serviceops.modules.notification.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record NotificationMarkReadReq(@NotEmpty List<Long> notificationIds) {
}
