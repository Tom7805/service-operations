package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Hoa don vua lap tu moc thanh toan (NCL-10-CN-002).
 *
 * @param contractValue gia tri hop dong tai thoi diem lap (da gom phu luc)
 * @param invoicedTotal tong da xuat hoa don cua hop dong SAU khi tinh hoa don nay
 */
public record InvoiceRes(
		Long id,
		String invoiceCode,
		Long contractId,
		Long milestoneId,
		String milestoneName,
		String status,
		BigDecimal totalAmount,
		LocalDate invoiceDate,
		LocalDate dueDate,
		String note,
		BigDecimal contractValue,
		BigDecimal invoicedTotal,
		String createdBy,
		LocalDateTime createdAt
) {
}
