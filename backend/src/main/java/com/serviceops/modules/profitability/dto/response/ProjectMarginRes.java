package com.serviceops.modules.profitability.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Bien loi nhuan gop cua du an (NCL-09-CN-003), tinh dong tu doanh thu ghi nhan
 * va gia von gio cong da duyet.
 */
public record ProjectMarginRes(
		Long projectId,
		BigDecimal recognizedRevenue,
		BigDecimal laborCost,
		BigDecimal projectExpenseCost,
		BigDecimal subcontractorCost,
		BigDecimal totalCost,
		BigDecimal grossProfit,
		BigDecimal marginRate,
		int missingCostEntryCount,
		int missingRateEntryCount,
		List<LaborCostLineRes> laborCostLines,
		List<RevenueLineRes> revenueLines
) {
}