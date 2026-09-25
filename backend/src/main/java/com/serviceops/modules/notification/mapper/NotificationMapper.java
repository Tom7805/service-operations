package com.serviceops.modules.notification.mapper;

import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.enums.NotificationTargetType;
import com.serviceops.modules.notification.enums.NotificationType;
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
				resolveTargetType(notification.getType()),
				notification.getIsRead(),
				notification.getReadAt(),
				notification.getSentAt()
		);
	}

	/**
	 * "Ban do" NCL-14-CN-001 Rule 2: moi {@link NotificationType} ung voi mot
	 * {@link NotificationTargetType} co dinh — suy ra tu {@code type} (chua tung doi theo thoi
	 * gian) nen ap dung duoc cho ca thong bao da luu tu truoc, khong can migrate du lieu (Rule 5).
	 */
	private NotificationTargetType resolveTargetType(NotificationType type) {
		return switch (type) {
			case TIMESHEET_SUBMITTED, TIMESHEET_REJECTED, TIMESHEET_REMINDER -> NotificationTargetType.TIMESHEET;
			case TIMER_AUTO_STOPPED -> NotificationTargetType.TASK;
			case EXPENSE_SUBMITTED -> NotificationTargetType.EXPENSE;
			case PROJECT_MILESTONE_DUE, NEGATIVE_MARGIN_ALERT -> NotificationTargetType.PROJECT;
			case CONTRACT_EXPIRING -> NotificationTargetType.CONTRACT;
			case INVOICE_PROPOSAL_CREATED -> NotificationTargetType.INVOICE_PROPOSAL;
			case DUNNING_REMINDER, RECURRING_INVOICE_GENERATED -> NotificationTargetType.INVOICE;
			case ACCEPTANCE_DECIDED_ON_PORTAL -> NotificationTargetType.ACCEPTANCE_CERTIFICATE;
		};
	}
}