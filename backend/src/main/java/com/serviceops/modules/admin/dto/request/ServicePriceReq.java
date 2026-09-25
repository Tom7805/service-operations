package com.serviceops.modules.admin.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Them moc gia moi cho dich vu (QTN-28) — moc cu duoc giu nguyen. */
public record ServicePriceReq(
		@NotNull(message = "Gia dich vu khong duoc de trong")
		@DecimalMin(value = "0.01", message = "Gia dich vu phai lon hon 0")
		@Digits(integer = 16, fraction = 2, message = "Gia dich vu toi da 16 chu so phan nguyen va 2 chu so thap phan")
		BigDecimal price,
		@NotNull(message = "Ngay hieu luc khong duoc de trong")
		LocalDate effectiveFrom,
		@Size(max = 500, message = "Ghi chu khong qua 500 ky tu")
		String note
) {}
