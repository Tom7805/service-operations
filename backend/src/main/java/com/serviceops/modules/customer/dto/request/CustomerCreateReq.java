package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record CustomerCreateReq(
	@NotBlank(message = "Ten khach hang khong duoc de trong")
	@Size(max = 255, message = "Ten khach hang khong qua 255 ky tu")
	String name,
	@Size(max = 50, message = "Ma so thue khong qua 50 ky tu")
	String taxCode,
	@Size(max = 255, message = "Linh vuc khong qua 255 ky tu")
	String industry,
	@Size(max = 500, message = "Dia chi khong qua 500 ky tu")
	String address
) {}
