package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ResolvedEmployeeHourlyRateRes(
		Long employeeId,
		BigDecimal hourlyRate,
		LocalDate effectiveFrom,
		boolean missingCostData
) {
}

