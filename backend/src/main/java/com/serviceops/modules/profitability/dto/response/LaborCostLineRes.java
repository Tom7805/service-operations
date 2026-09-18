package com.serviceops.modules.profitability.dto.response;

import com.serviceops.common.masking.MaskSensitive;
import com.serviceops.common.masking.MaskingLevel;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LaborCostLineRes(
		Long timeEntryId,
		Long employeeId,
		LocalDate workDate,
		BigDecimal hours,
		@MaskSensitive(MaskingLevel.COST) BigDecimal hourlyRate,
		@MaskSensitive(MaskingLevel.COST) BigDecimal laborCost,
		boolean missingCostData
) {
}