package com.serviceops.modules.quotation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Mot dong bao gia (NCL-03-CN-003): vai tro chuyen mon, cap bac (khong bat buoc) va so
 * ngay cong du kien. Khi co cap bac, don gia tra theo dung (vai tro, cap bac); khong co
 * thi lay don gia hieu luc gan nhat cua vai tro.
 */
public record QuoteItemReq(
		@NotBlank(message = "Vai tro chuyen mon khong duoc de trong")
		@Size(max = 255, message = "Vai tro chuyen mon khong qua 255 ky tu")
		String professionalRole,
		@Size(max = 100, message = "Cap bac khong qua 100 ky tu")
		String level,
		@NotNull(message = "So ngay cong khong duoc de trong")
		@Positive(message = "So ngay cong phai la so duong")
		BigDecimal workDays
) {}
