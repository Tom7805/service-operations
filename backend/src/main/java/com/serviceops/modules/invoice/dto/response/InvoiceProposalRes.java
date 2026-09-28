package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * De nghi xuat hoa don vua tao (NCL-10-CN-001).
 *
 * @param laborAmount   tong thanh tien cac dong gio cong (co the am neu ky chi con dong dao QTN-11)
 * @param expenseAmount tong thanh tien cac phieu chi phi tinh lai cho khach hang
 * @param totalAmount   {@code laborAmount + expenseAmount}
 * @param skipped       so dong gio cong bi bo qua theo tung ly do
 */
public record InvoiceProposalRes(
		Long id,
		String proposalCode,
		Long projectId,
		Long contractId,
		Long customerId,
		LocalDate periodFrom,
		LocalDate periodTo,
		String status,
		BigDecimal laborAmount,
		BigDecimal expenseAmount,
		BigDecimal totalAmount,
		String note,
		List<InvoiceProposalLineRes> laborLines,
		List<InvoiceProposalLineRes> expenseLines,
		InvoiceProposalSkippedRes skipped,
		String createdBy,
		LocalDateTime createdAt
) {
}
