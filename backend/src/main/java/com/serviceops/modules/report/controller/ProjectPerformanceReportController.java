package com.serviceops.modules.report.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.report.dto.response.ProjectPerformanceReportRes;
import com.serviceops.modules.report.dto.response.ProjectPerformanceRes;
import com.serviceops.modules.report.service.ProjectPerformanceReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-11-CN-003 — Báo cáo hiệu quả theo dự án.
 *
 * <p>Chỉ Quản lý dự án (VT-02) được xem (TC-03) và chỉ thấy dự án mình phụ trách (QTN-01), với cột giá vốn bị che
 * (NCL-01-CN-005-TC-01). {@code @PreAuthorize} chặn trước khi vào method nên mọi vai trò khác đều nhận 403, và
 * {@code GlobalExceptionHandler} cùng {@code AccessDeniedAuditRecorder} tự ghi nhật ký lần từ chối.</p>
 */
@RestController
@RequestMapping("/reports/project-performance")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-02')")
public class ProjectPerformanceReportController {

	private final ProjectPerformanceReportService projectPerformanceReportService;

	/** TC-01/TC-02: kế hoạch so với thực tế của mọi dự án mình quản lý, lọc theo trạng thái nếu có. */
	@GetMapping
	public BaseRes<ProjectPerformanceReportRes> report(@RequestParam(required = false) ProjectStatus status) {
		return BaseRes.ok(projectPerformanceReportService.getReport(status));
	}

	/** Cùng số liệu cho một dự án; dự án của quản lý khác bị 403. */
	@GetMapping("/{projectId}")
	public BaseRes<ProjectPerformanceRes> projectReport(@PathVariable Long projectId) {
		return BaseRes.ok(projectPerformanceReportService.getProjectReport(projectId));
	}
}
