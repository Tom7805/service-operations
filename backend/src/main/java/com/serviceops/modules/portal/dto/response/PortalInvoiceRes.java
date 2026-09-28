package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.invoice.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * NCL-13-CN-004: mot hoa don cua khach hang tren cong kem cong no hien tai. Hoa don nhap (DRAFT) chua phat
 * hanh nen khong hien tren cong; ghi chu noi bo cua ke toan cung khong tra ve.
 *
 * @param remainingAmount so con phai tra = tong - da tra (0 voi hoa don da huy)
 * @param overdue         con phai tra va da qua han thanh toan
 * @param daysOverdue     so ngay qua han, 0 khi chua qua han
 */
public record PortalInvoiceRes(
		Long id,
		String invoiceCode,
		Long contractId,
		String contractCode,
		LocalDate invoiceDate,
		LocalDate dueDate,
		InvoiceStatus status,
		BigDecimal totalAmount,
		BigDecimal paidAmount,
		BigDecimal remainingAmount,
		boolean overdue,
		long daysOverdue) {
}
