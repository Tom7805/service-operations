package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response co hoi ban hang (NCL-03-CN-001).
 *
 * @param customerName Ten khach hang de hien thi (lay tu bang customers).
 */
public record OpportunityRes(
	Long id,
	String name,
	Long customerId,
	String customerName,
	BigDecimal expectedValue,
	LocalDate expectedCloseDate,
	String stage,
	String status,
	BigDecimal probability,
	Long ownerId,
	String createdBy,
	LocalDateTime createdAt
) {}