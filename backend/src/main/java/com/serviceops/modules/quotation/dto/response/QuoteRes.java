package com.serviceops.modules.quotation.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record QuoteRes(
		Long id,
		Long opportunityId,
		Integer version,
		BigDecimal totalAmount,
		List<QuoteItemRes> items,
		List<String> missingRates,
		String createdBy,
		LocalDateTime createdAt
) {}