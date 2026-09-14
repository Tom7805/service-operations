package com.serviceops.modules.notification.mapper;

import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.entity.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

	public NotificationRes toResponse(Notification notification) {
		return new NotificationRes(
				notification.getId(),
				notification.getRecipientId(),
				notification.getType(),
				notification.getTitle(),
				notification.getContent(),
				notification.getChannel(),
				notification.getReferenceId(),
				notification.getReferenceType(),
				notification.getIsRead(),
				notification.getReadAt(),
				notification.getSentAt()
		);
	}
}