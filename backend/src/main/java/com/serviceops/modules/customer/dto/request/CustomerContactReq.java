package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
	@Pattern(regexp = "^$|^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$|^02\\d{8,9}$",
		message = "So dien thoai khong dung dinh dang (di dong VD: 0912345678, co dinh VD: 02438123456)")
	@Size(max = 30, message = "So dien thoai khong qua 30 ky tu")
	String phone,
	boolean isPrimary
) {}
