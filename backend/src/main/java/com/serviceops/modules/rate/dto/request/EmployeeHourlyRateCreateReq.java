package com.serviceops.modules.rate.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeHourlyRateCreateReq(
		@NotNull(message = "Chi phí giờ công không được để trống")
		@DecimalMin(value = "0.0", message = "Chi phí giờ công không được âm")
		BigDecimal hourlyRate,

		@NotNull(message = "Ngày hiệu lực không được để trống")
		LocalDate effectiveFrom
) {
}

