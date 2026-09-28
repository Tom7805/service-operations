package com.serviceops.modules.invoice.enums;

/**
 * Trang thai hoa don (Epic NCL-10). Hoa don theo moc hop dong (NCL-10-CN-002)
 * duoc lap la phat hanh ngay ({@link #ISSUED}); cac trang thai con lai danh cho
 * ghi nhan thanh toan (NCL-10-CN-003) va hoa don dinh ky (NCL-10-CN-005).
 */
public enum InvoiceStatus {

	/** Hoa don nhap, chua phat hanh (NCL-10-CN-005). */
	DRAFT,

	/** Da phat hanh, chua thu tien. */
	ISSUED,

	/** Khach hang da tra mot phan (NCL-10-CN-003). */
	PARTIALLY_PAID,

	/** Da thanh toan du (NCL-10-CN-003). */
	PAID,

	/** Da huy — khong tinh vao tong da xuat hoa don cua hop dong (QTN-19). */
	CANCELLED
}
