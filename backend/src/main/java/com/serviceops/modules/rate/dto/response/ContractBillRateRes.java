package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractBillRateRes(
		Long contractId,
		String professionalRole,
		String level,
		BigDecimal dailyRate,
		LocalDate effectiveFrom
) {
}

