package com.serviceops.modules.opportunity.dto.response;

import com.serviceops.modules.opportunity.enums.ActivityType;

import java.time.LocalDateTime;

public record ActivityRes(
	Long id,
	Long opportunityId,
	ActivityType activityType,
	LocalDateTime occurredAt,
	String participants,
	String content,
	String createdBy,
	LocalDateTime createdAt
) {}
