package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** NCL-05-CN-008: ghi nhan ngay thuc te hoan thanh cua moc tien do. */
public record ProjectMilestoneCompleteReq(
		@NotNull(message = "Ngay thuc te khong duoc de trong") LocalDate actualDate) {
}
