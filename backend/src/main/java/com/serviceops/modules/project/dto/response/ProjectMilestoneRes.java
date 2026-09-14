package com.serviceops.modules.project.dto.response;

import com.serviceops.modules.project.enums.MilestoneProgressStatus;
import com.serviceops.modules.project.enums.TaskStatus;

import java.time.LocalDate;
import java.util.List;

/**
 * NCL-05-CN-008: moc tien do tren bang theo doi — trang thai tinh dong
 * (DONE/ON_TRACK/LATE) va so ngay tre khi cham (TC-02).
 */
public record ProjectMilestoneRes(
		Long id,
		Long projectId,
		String name,
		String description,
		LocalDate plannedDate,
		LocalDate actualDate,
		MilestoneProgressStatus status,
		Long daysLate,
		List<ProjectMilestoneItemRes> items) {

	/** Hang muc phai hoan thanh cua moc — tra ve kem trang thai hien tai cua cong viec. */
	public record ProjectMilestoneItemRes(Long taskId, String taskName, TaskStatus taskStatus) {
	}
}
