package com.serviceops.modules.project.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectRes(
		Long id,
		String projectCode,
		String name,
		Long contractId,
		Long customerId,
		String projectType,
		BigDecimal limitValue,
		LocalDate startDate,
		LocalDate expectedEndDate,
		Long projectManagerId,
		String status,
		String createdBy,
		LocalDateTime createdAt
) {}