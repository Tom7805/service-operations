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

	CONTRACT_EXPIRING,

	/** NCL-09-CN-004: bien loi nhuan cua du an xuong duoi nguong toi thieu do Ban giam doc dat. */
	NEGATIVE_MARGIN_ALERT,

	/** NCL-10-CN-001: ke toan vua tao de nghi xuat hoa don tu gio cong cua du an do minh quan ly. */
	INVOICE_PROPOSAL_CREATED,

	/** NCL-10-CN-006: nhac hoa don sap toi han, dung han hoac da qua han thanh toan. */
	DUNNING_REMINDER,

	/** NCL-10-CN-005: rao soat dinh ky vua tu tao mot hoa don nhap tu dieu khoan hop dong duy tri. */
	RECURRING_INVOICE_GENERATED
}