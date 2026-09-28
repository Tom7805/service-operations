package com.serviceops.modules.acceptance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * NCL-12-CN-002 (TC-02): ghi nhan khach hang tu choi nghiem thu. Ly do bat buoc de nhom du an biet
 * phai chinh sua gi truoc khi nop lai.
 */
public record AcceptanceRejectReq(
		@NotBlank(message = "Ly do tu choi nghiem thu khong duoc de trong")
		@Size(max = 1000, message = "Ly do tu choi toi da 1000 ky tu") String reason,
		@Size(max = 255, message = "Ten nguoi dai dien toi da 255 ky tu") String signerName,
		@Size(max = 500, message = "Duong dan bien ban toi da 500 ky tu") String minutesUrl) {
}
