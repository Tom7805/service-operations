package com.serviceops.modules.report.dto.response;

import java.time.LocalDate;

/**
 * Bảng điều khiển vận hành của một kỳ. Hai bộ đếm "thiếu" là số dòng giờ công đã duyệt bị thiếu đơn giá vốn/bán:
 * dòng đó không làm hỏng bảng nhưng khiến doanh thu/biên thấp hơn thực tế.
 */
public record DashboardSummaryRes(
		LocalDate from,
		LocalDate to,
		DashboardKpiRes kpis,
		int missingCostEntryCount,
		int missingRevenueEntryCount) {
}
