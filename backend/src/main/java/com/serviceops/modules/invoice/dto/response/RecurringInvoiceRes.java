package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/** NCL-10-CN-005: hoa don nhap vua duoc sinh tu dieu khoan lap hoa don dinh ky. */
public record RecurringInvoiceRes(
		Long id,
		String invoiceNumber,
		Long contractId,
		Long customerId,
		LocalDate periodStart,
		LocalDate periodEnd,
		LocalDate issueDate,
		BigDecimal amount,
		String currency,
		String status) {
}
