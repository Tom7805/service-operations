package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Mot lan thanh toan trong lich su thanh toan cua hoa don (NCL-10-CN-003). */
public record PaymentItemRes(
		Long id,
		BigDecimal amount,
		LocalDate paymentDate,
		String method,
		String note,
		String createdBy,
		LocalDateTime createdAt
) {
}
