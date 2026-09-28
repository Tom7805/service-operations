package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Hoa don kem tinh hinh cong no hien tai — dung chung cho danh sach va chi tiet
 * (NCL-10-CN-003), de Ke toan chon hoa don can ghi nhan thanh toan.
 *
 * @param paidAmount      tong da thu cua hoa don (tong cac lan thanh toan)
 * @param remainingAmount so con phai thu = totalAmount - paidAmount
 */
public record InvoiceDetailRes(
		Long id,
		String invoiceCode,
		Long contractId,
		String contractCode,
		Long customerId,
		String customerName,
		String status,
		BigDecimal totalAmount,
		BigDecimal paidAmount,
		BigDecimal remainingAmount,
		LocalDate invoiceDate,
		LocalDate dueDate,
		String note,
		String createdBy,
		LocalDateTime createdAt
) {
}
