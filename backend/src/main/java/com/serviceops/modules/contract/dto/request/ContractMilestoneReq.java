package com.serviceops.modules.contract.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractMilestoneReq(
        @NotBlank(message = "Ten moc thanh toan khong duoc de trong") String name,
        @DecimalMin(value = "0.01", message = "Ty le thanh toan phai lon hon 0")
        @DecimalMax(value = "100.00", message = "Ty le thanh toan khong duoc vuot qua 100") BigDecimal percentage,
        @DecimalMin(value = "0.01", message = "So tien thanh toan phai lon hon 0") BigDecimal amount,
        LocalDate expectedDate,
        String acceptanceCondition
) {
}