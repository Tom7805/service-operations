package com.serviceops.modules.report.dto.response;

import com.serviceops.modules.project.enums.ProjectStatus;

import java.util.List;

/**
 * Báo cáo hiệu quả các dự án do người xem quản lý (NCL-11-CN-003). {@code status = null} là không lọc trạng thái.
 * Các bộ đếm chỉ xét dự án có kế hoạch ({@code planAvailable}).
 */
public record ProjectPerformanceReportRes(
		ProjectStatus status,
		int projectCount,
		int projectsWithoutPlanCount,
		int overPlannedHoursProjectCount,
		int belowPlannedMarginProjectCount,
		List<ProjectPerformanceRes> projects) {
}
