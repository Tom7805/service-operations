package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** NCL-10-CN-006: một lần nhắc thu nợ đã gửi cho một hóa đơn. */
public record DunningLogRes(
		Long id,
		Long invoiceId,
		String stage,
		LocalDate referenceDate,
		Integer daysOverdue,
		BigDecimal remainingAmount,
		List<Long> recipientIds,
		LocalDateTime sentAt) {
}
