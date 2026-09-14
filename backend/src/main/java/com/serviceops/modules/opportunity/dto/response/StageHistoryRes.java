package com.serviceops.modules.opportunity.dto.response;

import java.time.LocalDateTime;

/**
 * Response mot lan chuyen giai doan co hoi (NCL-03-CN-002, TC-05).
 */
public record StageHistoryRes(
		Long id,
		Long opportunityId,
		String fromStage,
		String toStage,
		String changedByUsername,
		LocalDateTime changedAt
) {}
