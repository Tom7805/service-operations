package com.serviceops.modules.project.dto.response;

import com.serviceops.modules.project.enums.TaskStatus;

import java.time.LocalDate;

/**
 * NCL-05-CN-004: mot cong viec dang duoc giao cho nguoi dung hien tai, dung cho man hinh
 * "Viec cua toi" — noi nhan vien tu xem va cap nhat tien do cong viec minh phu trach.
 */
public record MyTaskRes(Long taskId, Long projectId, String projectCode, String projectName,
		String taskName, String description, LocalDate expectedStartDate, LocalDate expectedEndDate,
		TaskStatus status) {
}
