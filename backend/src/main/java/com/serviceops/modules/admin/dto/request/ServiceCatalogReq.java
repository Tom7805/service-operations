package com.serviceops.modules.admin.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * NCL-15-CN-001-TC-01: tao dich vu moi kem gia va ngay hieu luc dau tien.
 *
 * @param price         gia cua moc dau tien (lon hon 0).
 * @param effectiveFrom ngay bat dau hieu luc cua moc gia dau tien.
 */
public record ServiceCatalogReq(
		@NotBlank(message = "Ten dich vu khong duoc de trong")
		@Size(max = 255, message = "Ten dich vu khong qua 255 ky tu")
		String name,
		@NotBlank(message = "Don vi tinh khong duoc de trong")
		@Size(max = 50, message = "Don vi tinh khong qua 50 ky tu")
		String unit,
		@Size(max = 1000, message = "Mo ta khong qua 1000 ky tu")
		String description,
		@NotNull(message = "Gia dich vu khong duoc de trong")
		@DecimalMin(value = "0.01", message = "Gia dich vu phai lon hon 0")
		@Digits(integer = 16, fraction = 2, message = "Gia dich vu toi da 16 chu so phan nguyen va 2 chu so thap phan")
		BigDecimal price,
		@NotNull(message = "Ngay hieu luc khong duoc de trong")
		LocalDate effectiveFrom
) {}
