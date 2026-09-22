package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mot dong cua de nghi xuat hoa don (NCL-10-CN-001). Dong {@code LABOR} co {@code timeEntryId}, {@code userId},
 * {@code hours}, {@code unitRate}; dong {@code EXPENSE} co {@code projectExpenseId} va cac truong kia la {@code null}.
 *
 * @param unitRate don gia GIO da ap dung tai ngay cong (don gia ngay ap dung / 8 gio)
 */
public record InvoiceProposalLineRes(
		Long id,
		String lineType,
		Long timeEntryId,
		Long projectExpenseId,
		LocalDate lineDate,
		Long userId,
		BigDecimal hours,
		BigDecimal unitRate,
		String description,
		BigDecimal amount
) {
}
