package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

/**
 * Chinh sua thong tin ho so khach hang da ton tai (ten / MST / SDT / nganh / dia chi).
 * Cung bo rang buoc voi {@link CustomerCreateReq}; giu record rieng cho ro hop dong API.
 * Nganh nghe / quy mo / muc do uu tien phan nhom van dung PATCH /customers/{id}/segment.
 */
public record CustomerUpdateReq(
	@NotBlank(message = "Ten khach hang khong duoc de trong")
	@Size(max = 255, message = "Ten khach hang khong qua 255 ky tu")
	String name,
	@Pattern(regexp = "^$|^\\d{10}(-\\d{3})?$",
		message = "Ma so thue khong dung dinh dang (10 chu so, VD: 0101234567; chi nhanh them \"-XXX\")")
	@Size(max = 50, message = "Ma so thue khong qua 50 ky tu")
	String taxCode,
	@Pattern(regexp = "^$|^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$|^02\\d{8,9}$",
		message = "So dien thoai khong dung dinh dang (di dong VD: 0912345678, co dinh VD: 02438123456)")
	@Size(max = 30, message = "So dien thoai khong qua 30 ky tu")
	String phone,
	@Size(max = 255, message = "Linh vuc khong qua 255 ky tu")
	String industry,
	@Size(max = 500, message = "Dia chi khong qua 500 ky tu")
	String address
) {}
