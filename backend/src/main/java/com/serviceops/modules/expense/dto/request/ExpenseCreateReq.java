package com.serviceops.modules.expense.dto.request;

import com.serviceops.modules.expense.enums.ExpenseType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseCreateReq(
		@NotNull(message = "Loai chi phi khong duoc de trong")
		ExpenseType type,

		@NotNull(message = "So tien chi phi khong duoc de trong")
		@DecimalMin(value = "0.01", message = "So tien chi phi phai lon hon 0")
		BigDecimal amount,

		@NotNull(message = "Ngay phat sinh khong duoc de trong")
		@PastOrPresent(message = "Ngay phat sinh khong duoc o tuong lai")
		LocalDate expenseDate,

		@NotBlank(message = "Mo ta chi phi khong duoc de trong")
		@Size(max = 1000, message = "Mo ta chi phi khong duoc vuot 1000 ky tu")
		String description,

		@Size(max = 500, message = "Duong dan chung tu khong duoc vuot 500 ky tu")
		String receiptUrl,

		Boolean billable) {
}
