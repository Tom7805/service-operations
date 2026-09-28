package com.serviceops.modules.rate.dto.response;

import com.serviceops.modules.timesheet.enums.WorkType;

import java.math.BigDecimal;

public record WorkTypeRateFactorRes(
		WorkType workType,
		BigDecimal factor
) {
}
