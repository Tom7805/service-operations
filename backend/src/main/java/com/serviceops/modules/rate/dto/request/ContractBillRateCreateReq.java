package com.serviceops.modules.rate.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractBillRateCreateReq(
		@NotBlank(message = "Vai trò chuyên môn không được để trống")
		String professionalRole,

		@NotBlank(message = "Cấp bậc không được để trống")
		String level,

		@NotNull(message = "Đơn giá theo ngày không được để trống")
		@DecimalMin(value = "0.0", message = "Đơn giá theo ngày không được âm")
		BigDecimal dailyRate,

		@NotNull(message = "Ngày hiệu lực không được để trống")
		LocalDate effectiveFrom
) {
}

