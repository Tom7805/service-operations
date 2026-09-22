package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lan thanh toan vua ghi nhan kem tinh hinh cong no moi cua hoa don (NCL-10-CN-003).
 *
 * @param paidAmount      tong da thu cua hoa don SAU khi tinh lan thanh toan nay
 * @param remainingAmount so con phai thu = totalAmount - paidAmount
 * @param invoiceStatus   trang thai hoa don sau khi cap nhat (PARTIALLY_PAID hoac PAID)
 */
public record PaymentRes(
		Long id,
		Long invoiceId,
		String invoiceCode,
		BigDecimal amount,
		LocalDate paymentDate,
		String method,
		String note,
		BigDecimal totalAmount,
		BigDecimal paidAmount,
		BigDecimal remainingAmount,
		String invoiceStatus,
		String createdBy,
		LocalDateTime createdAt
) {
}
