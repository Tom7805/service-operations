package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

public record RevenueForecastRes(
		BigDecimal totalExpectedRevenue,
		List<MonthlyRevenueForecast> months
) {

	public record MonthlyRevenueForecast(
			YearMonth month,
			BigDecimal expectedRevenue,
			int opportunityCount
	) {}
}
