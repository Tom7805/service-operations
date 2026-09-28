package com.serviceops.modules.report.dto.response;

import java.math.BigDecimal;

/**
 * Năm chỉ số chính của bảng điều khiển vận hành (NCL-11-CN-001). {@code averageMarginRate} và
 * {@code billableHoursRatio} là phân số (0.4000 = 40%), làm tròn 4 chữ số; kỳ không có dữ liệu thì mọi chỉ số bằng 0.
 */
public record DashboardKpiRes(
		BigDecimal recognizedRevenue,
		BigDecimal averageMarginRate,
		BigDecimal billableHoursRatio,
		int negativeMarginProjectCount,
		int overdueInvoiceCount) {
}
