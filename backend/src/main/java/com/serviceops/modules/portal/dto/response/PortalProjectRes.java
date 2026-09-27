package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.project.enums.ProjectStatus;

import java.time.LocalDate;

/**
 * NCL-13-CN-002: mot du an cua khach hang o muc tong quan. Chi gom thong tin khach hang duoc xem — khong co
 * gia tri han muc, ngan sach/gio cong, gia von, rui ro hay ghi chu noi bo (TC-03).
 *
 * @param progressPercent ty le cong viec da hoan thanh (0-100, lam tron), 0 khi du an chua co cong viec
 */
public record PortalProjectRes(
		Long id,
		String projectCode,
		String name,
		ProjectStatus status,
		LocalDate startDate,
		LocalDate expectedEndDate,
		String contractCode,
		String projectManagerName,
		int totalTasks,
		int doneTasks,
		int progressPercent,
		int totalMilestones,
		int doneMilestones,
		int lateMilestones,
		String nextMilestoneName,
		LocalDate nextMilestoneDate) {
}
