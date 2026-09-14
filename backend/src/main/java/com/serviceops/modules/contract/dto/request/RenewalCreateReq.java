package com.serviceops.modules.contract.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request gia han hop dong (NCL-04-CN-007).
 *
 * @param newEndDate      ngay ket thuc moi - bat buoc, phai sau ngay ket thuc hien tai (TC-01).
 * @param additionalValue gia tri bo sung neu co; null/0 = giu nguyen gia tri hop dong.
 * @param notes           ghi chu ly do gia han; khong bat buoc.
 */
public record RenewalCreateReq(
		@NotNull(message = "Phai nhap ngay ket thuc moi")
		LocalDate newEndDate,

		@DecimalMin(value = "0", message = "Gia tri bo sung khong duoc am")
		BigDecimal additionalValue,

		String notes
) {}
