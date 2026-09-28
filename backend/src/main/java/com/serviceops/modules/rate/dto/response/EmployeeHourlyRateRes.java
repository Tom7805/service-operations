package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeHourlyRateRes(
		Long id,
		Long employeeId,
		BigDecimal hourlyRate,
		LocalDate effectiveFrom
) {
}

