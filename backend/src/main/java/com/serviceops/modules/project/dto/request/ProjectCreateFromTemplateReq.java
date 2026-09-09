package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Request tạo dự án từ một mẫu có sẵn (NCL-05-CN-007).
 *
 * @param templateId       mẫu dự án dùng để dựng cây hạng mục, công việc và ngân sách giờ
 * @param name             tên dự án mới
 * @param startDate        ngày bắt đầu dự án
 * @param expectedEndDate  ngày kết thúc dự kiến
 * @param projectManagerId người quản lý dự án
 */
public record ProjectCreateFromTemplateReq(
		@NotNull(message = "Mau du an khong duoc de trong") Long templateId,
		@NotBlank(message = "Ten du an khong duoc de trong") String name,
		@NotNull(message = "Ngay bat dau khong duoc de trong") LocalDate startDate,
		@NotNull(message = "Ngay ket thuc du kien khong duoc de trong") LocalDate expectedEndDate,
		@NotNull(message = "Nguoi quan ly du an khong duoc de trong") Long projectManagerId
) {}
