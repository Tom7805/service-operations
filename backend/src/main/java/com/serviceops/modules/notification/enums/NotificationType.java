package com.serviceops.modules.notification.enums;

public enum NotificationType {

	TIMESHEET_SUBMITTED,

	/** NCL-06-CN-004: báo người nộp biết bảng chấm công vừa bị PM từ chối kèm lý do. */
	TIMESHEET_REJECTED,

	/** NCL-06-CN-008: báo người dùng biết đồng hồ bấm giờ bị tự động dừng vì chạy quá 12 giờ. */
	TIMER_AUTO_STOPPED,

	/** NCL-06-CN-009: nhắc nhân viên/PM khi còn bảng chấm công chưa nộp cuối tuần. */
	TIMESHEET_REMINDER,

	EXPENSE_SUBMITTED,

	PROJECT_MILESTONE_DUE,

	CONTRACT_EXPIRING
}