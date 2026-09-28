package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractBillRateRes(
		/** Id dong don gia rieng — de sua dung dong (PUT /contracts/{contractId}/bill-rates/{id}). */
		Long id,
		Long contractId,
		String professionalRole,
		String level,
		BigDecimal dailyRate,
		LocalDate effectiveFrom
) {
}

