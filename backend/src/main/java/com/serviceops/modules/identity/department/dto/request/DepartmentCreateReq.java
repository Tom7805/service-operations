package com.serviceops.modules.identity.department.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DepartmentCreateReq(
	@NotBlank(message = "Ten bo phan khong duoc de trong")
	@Size(max = 255, message = "Ten bo phan khong qua 255 ky tu")
	String name,
	Long parentId,
	@NotNull(message = "Phai chon nguoi quan ly")
	Long managerId
) {}
