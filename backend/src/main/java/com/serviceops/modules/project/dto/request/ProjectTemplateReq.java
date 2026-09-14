package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Request tạo hoặc cập nhật mẫu dự án (NCL-05-CN-007).
 */
public record ProjectTemplateReq(
		@NotBlank(message = "Ma mau du an khong duoc de trong") String code,
		@NotBlank(message = "Ten mau du an khong duoc de trong") String name,
		String description,
		@NotBlank(message = "Loai du an khong duoc de trong") String projectType
) {}
