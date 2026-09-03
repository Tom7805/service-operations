package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record CustomerCreateReq(
	@NotBlank(message = "Ten khach hang khong duoc de trong")
	@Size(max = 255, message = "Ten khach hang khong qua 255 ky tu")
	String name,
	// Ma so thue doanh nghiep VN: dung 10 chu so, hoac 10 so + "-" + 3 so cho
	// chi nhanh/don vi truc thuoc (Thong tu 105/2020/TT-BTC). Rong ("") duoc
	// chap nhan vi truong nay tuy chon - chi kiem tra dinh dang KHI CO nhap.
	@Pattern(regexp = "^$|^\\d{10}(-\\d{3})?$",
		message = "Ma so thue khong dung dinh dang (10 chu so, VD: 0101234567; chi nhanh them \"-XXX\")")
	@Size(max = 50, message = "Ma so thue khong qua 50 ky tu")
	String taxCode,
	// So dien thoai VN sau quy hoach 2018: di dong 10 so dung dau so nha mang
	// dang cap phep, hoac co dinh 02x + 8-9 so. Rong duoc chap nhan (tuy chon).
	@Pattern(regexp = "^$|^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$|^02\\d{8,9}$",
		message = "So dien thoai khong dung dinh dang (di dong VD: 0912345678, co dinh VD: 02438123456)")
	@Size(max = 30, message = "So dien thoai khong qua 30 ky tu")
	String phone,
	@Size(max = 255, message = "Linh vuc khong qua 255 ky tu")
	String industry,
	@Size(max = 500, message = "Dia chi khong qua 500 ky tu")
	String address
) {}
