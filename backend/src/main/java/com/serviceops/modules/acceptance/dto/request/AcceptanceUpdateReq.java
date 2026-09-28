package com.serviceops.modules.acceptance.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * NCL-12-CN-002 (TC-02): chinh sua va nop lai phieu sau khi khach hang tu choi. He thong dung lai
 * danh sach cong viec/san pham ban giao tu hang muc tai thoi diem nop lai.
 */
public record AcceptanceUpdateReq(
		@Size(max = 255, message = "Tieu de phieu toi da 255 ky tu") String title,
		@NotNull(message = "Gia tri nghiem thu khong duoc de trong")
		@DecimalMin(value = "0.00", message = "Gia tri nghiem thu khong duoc am")
		@Digits(integer = 16, fraction = 2, message = "Gia tri nghiem thu toi da 16 chu so phan nguyen va 2 chu so thap phan")
		BigDecimal acceptedValue,
		@Size(max = 1000, message = "Ghi chu toi da 1000 ky tu") String note) {
}
