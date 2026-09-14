package com.serviceops.modules.quotation.dto.response;

import java.math.BigDecimal;

public record QuoteItemRes(
		String professionalRole,
		BigDecimal workDays,
		BigDecimal unitRate,
		BigDecimal amount,
		boolean priced
) {}