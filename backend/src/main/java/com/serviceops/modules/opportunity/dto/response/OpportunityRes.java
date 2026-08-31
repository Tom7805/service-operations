package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record OpportunityRes(
	Long id,
	String name,
	Long customerId,
	String customerName,
	Long ownerUserId,
	String ownerFullName,
	String stage,
	BigDecimal amount,
	LocalDate expectedCloseDate,
	String note,
	LocalDateTime createdAt
) {
}
