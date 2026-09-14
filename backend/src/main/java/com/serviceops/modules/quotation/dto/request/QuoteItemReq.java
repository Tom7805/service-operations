package com.serviceops.modules.quotation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record QuoteItemReq(
		@NotBlank(message = "Vai tro chuyen mon khong duoc de trong")
		String professionalRole,
		@NotNull(message = "So ngay cong khong duoc de trong")
		@Positive(message = "So ngay cong phai la so duong")
		BigDecimal workDays
) {}