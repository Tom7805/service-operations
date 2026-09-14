package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotBlank;

public record WorkPackageReq(Long parentId,
		@NotBlank(message = "Ten hang muc khong duoc de trong") String name,
		String description, Integer sortOrder) {}
