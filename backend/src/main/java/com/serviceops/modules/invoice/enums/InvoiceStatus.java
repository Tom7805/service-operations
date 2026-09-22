package com.serviceops.modules.invoice.enums;

/**
 * Trang thai hoa don (Epic NCL-10). Hoa don dinh ky (NCL-10-CN-005) luon khoi tao o
 * trang thai {@link #DRAFT} de Ke toan soat lai truoc khi phat hanh — cac trang thai
 * con lai phuc vu vong doi hoa don day du, se duoc cac story sau (NCL-10-CN-001..003)
 * su dung.
 */
public enum InvoiceStatus {

	/** Hoa don nhap, chua phat hanh cho khach hang. Trang thai khoi tao. */
	DRAFT,

	/** Da phat hanh cho khach hang. */
	ISSUED,

	/** Da huy, khong con hieu luc. */
	CANCELLED
}
