package com.serviceops.modules.expense.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExpenseRejectReq(
		@NotBlank(message = "Ly do tu choi khong duoc de trong")
		@Size(max = 1000, message = "Ly do tu choi khong duoc vuot 1000 ky tu")
		String reason) {
}