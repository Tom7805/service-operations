package com.serviceops.modules.acceptance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** NCL-12-CN-004: ghi nhan mot lan ban giao (phien ban moi) cua san pham. */
public record DeliverableVersionReq(
		@NotBlank(message = "So phien ban khong duoc de trong")
		@Size(max = 50, message = "So phien ban toi da 50 ky tu") String versionNo,
		@NotNull(message = "Ngay ban giao khong duoc de trong") LocalDate deliveredDate,
		@NotBlank(message = "Nguoi nhan ban giao khong duoc de trong")
		@Size(max = 255, message = "Ten nguoi nhan toi da 255 ky tu") String receiverName,
		@Size(max = 500, message = "Duong dan tep toi da 500 ky tu") String fileUrl,
		@Size(max = 1000, message = "Ghi chu toi da 1000 ky tu") String note) {
}
