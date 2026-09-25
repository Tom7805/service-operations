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
	RECURRING_INVOICE_GENERATED,

	/** NCL-13-CN-003: khach hang vua xac nhan hoac tu choi phieu nghiem thu tren cong — bao PM du an. */
	ACCEPTANCE_DECIDED_ON_PORTAL,

	/**
	 * NCL-14-CN-002: ban tong hop cuoi ngay cho cac thong bao nguoi dung chon nhan theo tan suat
	 * DAILY_DIGEST. Duoc {@code NotificationDigestServiceImpl} tao truc tiep (khong di qua
	 * {@code NotificationDispatcher}) nen khong thuoc bat ky {@link NotificationGroup} nao —
	 * tranh vong lap gop-cua-gop.
	 */
	DAILY_DIGEST_SUMMARY;

	/**
	 * Nhom nghiep vu (NCL-14-CN-002) dung de tra cau hinh nhan thong bao — null cho
	 * {@link #DAILY_DIGEST_SUMMARY} vi ban tong hop khong di qua co che cau hinh nay.
	 */
	public NotificationGroup group() {
		return switch (this) {
			case TIMESHEET_SUBMITTED, TIMESHEET_REJECTED, TIMER_AUTO_STOPPED, TIMESHEET_REMINDER ->
					NotificationGroup.TIMESHEET;
			case EXPENSE_SUBMITTED -> NotificationGroup.EXPENSE;
			case PROJECT_MILESTONE_DUE, NEGATIVE_MARGIN_ALERT -> NotificationGroup.PROJECT;
			case CONTRACT_EXPIRING -> NotificationGroup.CONTRACT;
			case INVOICE_PROPOSAL_CREATED, DUNNING_REMINDER, RECURRING_INVOICE_GENERATED -> NotificationGroup.INVOICE;
			case ACCEPTANCE_DECIDED_ON_PORTAL -> NotificationGroup.ACCEPTANCE;
			case DAILY_DIGEST_SUMMARY -> null;
		};
	}
}