package com.serviceops.modules.project.dto.response;

import java.math.BigDecimal;

public record TaskBudgetStatusRes(Long taskId, Long projectId, BigDecimal budgetHours, BigDecimal approvedHours,
		BigDecimal usageRatio, boolean overBudgetWarning) {
}
