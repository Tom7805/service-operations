package com.serviceops.modules.report.dto.response;

import com.serviceops.modules.contract.enums.ContractType;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Map;

/**
 * Doanh thu ghi nhận của một tháng (NCL-11-CN-005). {@code byContractType} luôn đủ bốn loại hợp đồng (loại không có
 * doanh thu là 0) để biểu đồ chồng cột không bị thiếu chuỗi. {@code changePercent} là số phần trăm 2 chữ số so với
 * cùng tháng năm trước; {@code null} khi năm trước bằng 0.
 */
public record MonthlyRevenueRes(
		YearMonth month,
		BigDecimal revenue,
		Map<ContractType, BigDecimal> byContractType,
		BigDecimal previousYearRevenue,
		BigDecimal changePercent) {
}
