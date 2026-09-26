package com.serviceops.modules.notification.service;

import com.serviceops.modules.notification.dto.request.NotificationDedupConfigReq;
import com.serviceops.modules.notification.dto.response.NotificationDedupConfigRes;
import com.serviceops.modules.notification.enums.NotificationType;

import java.util.List;

public interface NotificationDedupConfigService {

	List<NotificationDedupConfigRes> getConfigs();

	void updateConfig(NotificationType eventType, NotificationDedupConfigReq request);
}
