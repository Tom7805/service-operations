package com.serviceops.modules.project.dto.response;

import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;

import java.time.LocalDate;

/**
 * Cong viec dang duoc giao cho nguoi dung hien tai, gom ca thong tin du an de
 * hien thi tren man hinh "Cong viec cua toi" — khong gioi han vai tro cu the.
 */
public record MyTaskRes(
		Long taskId,
		String taskName,
		TaskStatus taskStatus,
		LocalDate expectedStartDate,
		LocalDate expectedEndDate,
		Long projectId,
		String projectCode,
		String projectName,
		ProjectStatus projectStatus,
		LocalDate assignmentStartDate,
		LocalDate assignmentEndDate
) {
}
