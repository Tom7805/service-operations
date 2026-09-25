package com.serviceops.modules.admin.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * QTN-30 — buoc 2 cua phuc hoi: gui lai ma xac nhan nhan duoc o buoc 1 va nhap lai mat khau cua chinh
 * quan tri vien da tao yeu cau.
 */
public record RestoreConfirmReq(
		@NotBlank(message = "Ma xac nhan khong duoc de trong")
		String confirmationToken,
		@NotBlank(message = "Phai nhap lai mat khau de xac nhan phuc hoi")
		String password
) {}
