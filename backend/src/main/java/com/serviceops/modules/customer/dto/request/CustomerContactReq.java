package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerContactReq(
	@NotBlank(message = "Ho ten nguoi lien he khong duoc de trong")
	@Size(max = 255, message = "Ho ten khong qua 255 ky tu")
	String fullName,
	@Size(max = 255, message = "Chuc danh khong qua 255 ky tu")
	String title,
	@Email(message = "Thu dien tu khong hop le")
	@Size(max = 255, message = "Thu dien tu khong qua 255 ky tu")
	String email,
	@Size(max = 30, message = "So dien thoai khong qua 30 ky tu")
	String phone,
	boolean isPrimary
) {}
