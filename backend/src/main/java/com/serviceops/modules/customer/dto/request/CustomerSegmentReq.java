package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerSegmentReq(
		@NotBlank(message = "Nganh nghe khong duoc de trong")
		@Size(max = 255, message = "Nganh nghe khong qua 255 ky tu")
		String industry,
		@NotBlank(message = "Quy mo khong duoc de trong")
		@Size(max = 50, message = "Quy mo khong qua 50 ky tu")
		String companySize,
		@NotBlank(message = "Muc do uu tien khong duoc de trong")
		@Size(max = 50, message = "Muc do uu tien khong qua 50 ky tu")
		String priority
) {}
