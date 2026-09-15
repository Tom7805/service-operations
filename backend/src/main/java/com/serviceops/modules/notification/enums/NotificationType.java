package com.serviceops.modules.notification.enums;

public enum NotificationType {

	TIMESHEET_SUBMITTED,

	/** NCL-06-CN-009: nhắc nhân viên/PM khi còn bảng chấm công chưa nộp cuối tuần. */
	TIMESHEET_REMINDER,

	EXPENSE_SUBMITTED,

	PROJECT_MILESTONE_DUE,

	CONTRACT_EXPIRING
}