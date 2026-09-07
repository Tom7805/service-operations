package com.serviceops.modules.contract.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractMilestoneRes(
        Long id,
        Long contractId,
        String name,
        BigDecimal percentage,
        BigDecimal amount,
        LocalDate expectedDate,
        String acceptanceCondition,
        String status,
        String createdBy
) {
}