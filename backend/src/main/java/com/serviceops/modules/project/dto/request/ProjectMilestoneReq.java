package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * NCL-05-CN-008: yeu cau tao/cap nhat moc tien do — ten, ngay ke hoach va cac hang muc
 * phai hoan thanh (danh sach id cong viec trong cay cong viec cua du an).
 */
public record ProjectMilestoneReq(
		@NotBlank(message = "Ten moc tien do khong duoc de trong") String name,
		String description,
		@NotNull(message = "Ngay ke hoach khong duoc de trong") LocalDate plannedDate,
		@NotEmpty(message = "Moc tien do phai co it nhat mot hang muc phai hoan thanh") List<Long> taskIds) {
}
