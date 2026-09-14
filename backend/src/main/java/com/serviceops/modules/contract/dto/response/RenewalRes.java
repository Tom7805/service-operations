package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Ban ghi gia han hop dong tra ve cho FE (NCL-04-CN-007). */
public record RenewalRes(
		Long id,
		Long contractId,
		LocalDate previousEndDate,
		LocalDate newEndDate,
		BigDecimal additionalValue,
		BigDecimal valueBefore,
		BigDecimal valueAfter,
		String notes,
		String createdBy,
		LocalDateTime createdAt
) {}
