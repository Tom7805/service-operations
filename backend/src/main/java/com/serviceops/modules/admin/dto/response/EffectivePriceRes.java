package com.serviceops.modules.admin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Gia dich vu ap dung cho mot ngay lap bao gia / hoa don (QTN-28).
 *
 * @param date          ngay can ap gia (ngay lap chung tu).
 * @param effectiveFrom ngay bat dau hieu luc cua moc gia duoc ap.
 */
public record EffectivePriceRes(
		Long serviceItemId,
		String code,
		String name,
		String unit,
		LocalDate date,
		BigDecimal price,
		LocalDate effectiveFrom
) {}
