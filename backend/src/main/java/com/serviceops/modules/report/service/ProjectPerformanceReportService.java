package com.serviceops.modules.report.service;

import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.report.dto.response.ProjectPerformanceReportRes;
import com.serviceops.modules.report.dto.response.ProjectPerformanceRes;

public interface ProjectPerformanceReportService {

	/**
	 * NCL-11-CN-003: kế hoạch so với thực tế của mọi dự án do người đang đăng nhập quản lý (QTN-01); ghi nhật ký mỗi
	 * lượt xem. {@code status = null} là không lọc trạng thái.
	 */
	ProjectPerformanceReportRes getReport(ProjectStatus status);

	/**
	 * Cùng số liệu cho một dự án.
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException {@code RESOURCE_NOT_FOUND} khi không có dự án
	 * @throws org.springframework.security.access.AccessDeniedException khi dự án không do người xem quản lý
	 */
	ProjectPerformanceRes getProjectReport(Long projectId);
}
