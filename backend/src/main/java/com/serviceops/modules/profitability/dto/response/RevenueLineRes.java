package com.serviceops.modules.profitability.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mot dong doanh thu ghi nhan tu dong gio cong da duyet cua hop dong theo gio
 * (NCL-09-CN-002, phuong thuc {@code HOURLY}).
 */
public record RevenueLineRes(
		Long timeEntryId,
		Long employeeId,
		LocalDate workDate,
		BigDecimal hours,
		BigDecimal appliedRate,
		BigDecimal lineRevenue,
		boolean billable,
		boolean missingRateData
) {
}
