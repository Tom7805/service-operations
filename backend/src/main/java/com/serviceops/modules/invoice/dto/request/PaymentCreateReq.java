package com.serviceops.modules.invoice.dto.request;

import com.serviceops.modules.invoice.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Yeu cau ghi nhan mot lan khach hang thanh toan cho hoa don (NCL-10-CN-003). */
public record PaymentCreateReq(
		@NotNull(message = "So tien thanh toan khong duoc de trong")
		@DecimalMin(value = "0.01", message = "So tien thanh toan phai lon hon 0")
		@Digits(integer = 16, fraction = 2, message = "So tien thanh toan toi da 2 chu so thap phan")
		BigDecimal amount,
		@NotNull(message = "Ngay thanh toan khong duoc de trong") LocalDate paymentDate,
		@NotNull(message = "Hinh thuc thanh toan khong duoc de trong") PaymentMethod method,
		@Size(max = 1000, message = "Ghi chu thanh toan khong duoc qua 1000 ky tu") String note
) {
}
