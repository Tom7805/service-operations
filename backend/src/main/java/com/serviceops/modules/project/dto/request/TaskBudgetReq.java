package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TaskBudgetReq(
		@NotNull(message = "Ngan sach gio cong khong duoc de trong")
		@DecimalMin(value = "0.01", message = "Ngan sach gio cong phai lon hon 0")
		BigDecimal budgetHours) {
}
