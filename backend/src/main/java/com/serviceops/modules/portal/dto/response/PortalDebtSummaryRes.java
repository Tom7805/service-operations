package com.serviceops.modules.portal.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * NCL-13-CN-004: tong hop cong no cua khach hang tren cong (hoa don da phat hanh, khong tinh hoa don da huy).
 *
 * @param nextDueDate   han thanh toan gan nhat (hom nay hoac sau) cua hoa don con no, null neu khong co
 * @param nextDueAmount so con phai tra cua cac hoa don co han {@code nextDueDate}
 */
public record PortalDebtSummaryRes(
		Long customerId,
		String customerCode,
		String customerName,
		int invoiceCount,
		BigDecimal totalInvoiced,
		BigDecimal totalPaid,
		BigDecimal totalOutstanding,
		int overdueInvoiceCount,
		BigDecimal totalOverdue,
		LocalDate nextDueDate,
		BigDecimal nextDueAmount) {
}
