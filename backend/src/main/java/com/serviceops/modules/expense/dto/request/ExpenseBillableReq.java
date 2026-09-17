package com.serviceops.modules.expense.dto.request;

import jakarta.validation.constraints.NotNull;

public record ExpenseBillableReq(
		@NotNull(message = "Trang thai tinh lai cho khach hang khong duoc de trong")
		Boolean billable) {
}