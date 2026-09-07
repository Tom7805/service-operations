package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public record RevenueForecastRes(
		BigDecimal totalExpectedRevenue,
		List<MonthlyRevenueForecast> months
) {

	public record MonthlyRevenueForecast(
			YearMonth month,
			BigDecimal expectedRevenue,
			int opportunityCount,
			List<OpportunityForecastItem> opportunities
	) {}

	/**
	 * Một cơ hội đang đóng góp vào doanh thu kỳ vọng của tháng — dùng để bung
	 * chi tiết khi bấm vào nhãn "X cơ hội mở" trên biểu đồ, tránh phải chuyển
	 * sang màn hình khác mới xem được cơ hội nào cấu thành con số đó.
	 */
	public record OpportunityForecastItem(
			Long id,
			String name,
			String customerName,
			BigDecimal expectedValue,
			BigDecimal probability,
			BigDecimal weightedRevenue,
			LocalDate expectedCloseDate
	) {}
}
