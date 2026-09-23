package com.serviceops.modules.invoice.enums;

/**
 * Trang thai de nghi xuat hoa don (NCL-10-CN-001). De nghi moi tao luon o {@link #PENDING}; hai trang thai con
 * lai danh cho buoc lap hoa don tu de nghi va huy de nghi o cac story sau cua Epic NCL-10.
 */
public enum ProposalStatus {

	/** Vua tao, cho ke toan lap hoa don tu de nghi nay. */
	PENDING,

	/** Da lap hoa don tu de nghi. */
	INVOICED,

	/** Da huy — cac dong cua de nghi phai duoc giai phong de lan sau gom lai duoc. */
	CANCELLED
}
