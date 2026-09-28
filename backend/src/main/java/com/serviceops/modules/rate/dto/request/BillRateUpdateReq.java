package com.serviceops.modules.rate.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Sua truc tiep mot dong don gia (bang chung hoac rieng theo hop dong) chua ap dung truoc hom nay —
 * vai tro va cap bac giu nguyen, chi doi muc gia va ngay hieu luc. Xem {@code RateEditRules}.
 */
public record BillRateUpdateReq(
		@NotNull(message = "Đơn giá theo ngày không được để trống")
		@DecimalMin(value = "0.00", message = "Đơn giá theo ngày không được âm")
		BigDecimal dailyRate,

		@NotNull(message = "Ngày hiệu lực không được để trống")
		LocalDate effectiveFrom
) {}
