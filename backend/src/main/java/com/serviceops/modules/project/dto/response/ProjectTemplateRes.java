package com.serviceops.modules.project.dto.response;

import java.time.LocalDateTime;

/**
 * Thông tin một mẫu dự án trả về cho FE khi chọn mẫu để tạo dự án (NCL-05-CN-007).
 */
public record ProjectTemplateRes(
		Long id,
		String code,
		String name,
		String description,
		String projectType,
		Boolean active,
		String createdBy,
		LocalDateTime createdAt
) {}
