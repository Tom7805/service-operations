package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ResolvedContractBillRateRes(
		BigDecimal dailyRate,
		LocalDate effectiveFrom,
		boolean isContractSpecific
) {
}

