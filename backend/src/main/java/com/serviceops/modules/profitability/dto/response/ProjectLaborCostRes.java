package com.serviceops.modules.profitability.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record ProjectLaborCostRes(
		Long projectId,
		BigDecimal totalApprovedHours,
		BigDecimal totalLaborCost,
		int missingCostEntryCount,
		List<LaborCostLineRes> lines
) {
}