package com.serviceops.modules.invoice.enums;

/**
 * Nguon phat sinh hoa don (Epic NCL-10) — dung de phan biet hoa don den tu dau khi
 * liet ke chung mot bang {@code invoices}.
 */
public enum InvoiceSource {

	/** Gom tu gio cong da duyet (NCL-10-CN-001) — chua trien khai. */
	TIME_ENTRY,

	/** Lap theo moc thanh toan cua hop dong (NCL-10-CN-002) — chua trien khai. */
	MILESTONE,

	/** Sinh tu dieu khoan lap hoa don dinh ky cua hop dong duy tri (NCL-10-CN-005). */
	RECURRING
}
