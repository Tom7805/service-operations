package com.serviceops.modules.acceptance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * NCL-12-CN-002 (TC-01): Quan ly du an ghi nhan khach hang da xac nhan phieu, kem bien ban nghiem
 * thu mo phong da tai len.
 */
public record AcceptanceConfirmReq(
		@NotBlank(message = "Ten nguoi dai dien khach hang ky xac nhan khong duoc de trong")
		@Size(max = 255, message = "Ten nguoi ky toi da 255 ky tu") String signerName,
		@NotNull(message = "Ngay ky bien ban khong duoc de trong") LocalDate signedDate,
		@NotBlank(message = "Bien ban nghiem thu da ky khong duoc de trong")
		@Size(max = 500, message = "Duong dan bien ban toi da 500 ky tu") String minutesUrl) {
}
