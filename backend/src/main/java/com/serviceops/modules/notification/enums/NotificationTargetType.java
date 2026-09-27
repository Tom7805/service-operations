package com.serviceops.modules.notification.enums;

/**
 * Loai ban ghi ma mot thong bao dang noi toi — dung rieng cho dieu huong tren FE khi
 * nguoi dung bam mo mot thong bao (NCL-14-CN-001 TC-02).
 *
 * <p><b>Vi sao tach rieng khoi {@code referenceType} tren {@link com.serviceops.modules.notification.entity.Notification}:</b>
 * {@code referenceType} da bi mot so noi gui thong bao (VD {@code DunningServiceImpl},
 * {@code MarginAlertServiceImpl}) dung lam khoa chong gui trung (QTN-27) — gia tri cua no la
 * mot chuoi ghep (vi du {@code "Dunning:5:FIRST_REMINDER:2026-09-01"}), khong phai ten loai
 * ban ghi nen khong dung de dieu huong duoc. De khong dung vao logic chong trung dang chay on
 * dinh, {@code targetType} duoc suy ra <b>tu {@link NotificationType}</b> (khong tu
 * {@code referenceType}) ngay khi tra du lieu ve — nho vay ap dung duoc ngay ca cho du lieu
 * thong bao da gui tu truoc, khong can migrate lai.</p>
 */
public enum NotificationTargetType {

	/** Bang cham cong tuan — referenceId la id cua Timesheet, tru truong hop tu nhac nho ban than
	 * (TIMESHEET_REMINDER) thi referenceId la userId cua chinh nguoi nhan, khong phai mot Timesheet cu the. */
	TIMESHEET,

	/** Cong viec (Task) trong du an — vi du dong ho bam gio bi tu dong dung. */
	TASK,

	/** Du an — vi du canh bao loi nhuan am. */
	PROJECT,

	/** Hoa don da phat hanh. */
	INVOICE,

	/** De nghi xuat hoa don, truoc khi tro thanh Invoice chinh thuc. */
	INVOICE_PROPOSAL,

	/** Phieu nghiem thu. */
	ACCEPTANCE_CERTIFICATE,

	/** Chi phi du an / chi phi thau phu. */
	EXPENSE,

	/** Hop dong. */
	CONTRACT,

	/** Khong co dich dieu huong cu the — ban tong hop (NCL-14-CN-002 DAILY_DIGEST_SUMMARY). */
	NONE
}
