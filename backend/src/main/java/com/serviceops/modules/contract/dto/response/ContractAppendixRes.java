package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ContractAppendixRes(
		Long id,
		Long contractId,
		String content,
		BigDecimal adjustmentValue,
		BigDecimal valueBefore,
		BigDecimal valueAfter,
		LocalDate effectiveDate,
		String createdBy,
		LocalDateTime createdAt
) {
}