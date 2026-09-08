package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot moc thanh toan tra ve cho FE (NCL-04-CN-003).
 *
 * @param status Trang thai moc; moc moi luon la PLANNED.
 */
public record MilestoneRes(
		Long id,
		Long contractId,
		String name,
		BigDecimal percentage,
		BigDecimal amount,
		LocalDate expectedDate,
		String acceptanceCondition,
		String status,
		Integer sortOrder,
		LocalDateTime createdAt
) {}
