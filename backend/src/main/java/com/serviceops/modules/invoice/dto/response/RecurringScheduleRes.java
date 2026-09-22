package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** NCL-10-CN-005: dieu khoan lap hoa don dinh ky hien hanh cua mot hop dong. */
public record RecurringScheduleRes(
		Long id,
		Long contractId,
		Integer billingDayOfMonth,
		BigDecimal amount,
		String currency,
		Boolean active,
		String lastGeneratedPeriod,
		String notes,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {
}
