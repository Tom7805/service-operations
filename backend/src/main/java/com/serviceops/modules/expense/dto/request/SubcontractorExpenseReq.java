package com.serviceops.modules.expense.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** NCL-08-CN-004: du lieu tao phieu chi phi thue ngoai. */
public record SubcontractorExpenseReq(
		@NotBlank(message = "Nha thau khong duoc de trong")
		@Size(max = 200, message = "Ten nha thau khong duoc vuot 200 ky tu")
		String contractorName,

		@NotBlank(message = "Pham vi cong viec khong duoc de trong")
		@Size(max = 1000, message = "Pham vi cong viec khong duoc vuot 1000 ky tu")
		String workScope,

		@NotNull(message = "So tien chi phi khong duoc de trong")
		@DecimalMin(value = "0.01", message = "So tien chi phi phai lon hon 0")
		BigDecimal amount,

		@NotNull(message = "Ky phat sinh khong duoc de trong")
		@PastOrPresent(message = "Ky phat sinh khong duoc o tuong lai")
		LocalDate incurredPeriod) {
}
