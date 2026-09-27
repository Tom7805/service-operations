package com.serviceops.modules.report.dto.response;

import com.serviceops.modules.contract.enums.ContractType;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * Báo cáo doanh thu theo tháng (NCL-11-CN-005). {@code hasData = false} khi kỳ không có doanh thu ghi nhận nào (TC-02):
 * {@code months} vẫn đủ các tháng với giá trị 0 để giao diện hiện trạng thái rỗng thay vì lỗi.
 */
public record MonthlyRevenueReportRes(
		YearMonth fromMonth,
		YearMonth toMonth,
		boolean hasData,
		BigDecimal totalRevenue,
		Map<ContractType, BigDecimal> totalByContractType,
		BigDecimal previousYearTotalRevenue,
		BigDecimal totalChangePercent,
		List<MonthlyRevenueRes> months,
		int missingRevenueEntryCount,
		List<String> warnings) {
}
