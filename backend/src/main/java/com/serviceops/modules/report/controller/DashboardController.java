package com.serviceops.modules.report.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.DashboardSummaryRes;
import com.serviceops.modules.report.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * NCL-11-CN-001 — Bảng điều khiển vận hành.
 *
 * <p>Chỉ Ban giám đốc (VT-01) được xem (QTN-01). {@code @PreAuthorize} chặn trước khi vào method nên mọi vai
 * trò khác đều nhận 403, và {@code GlobalExceptionHandler} cùng {@code AccessDeniedAuditRecorder} tự ghi nhật
 * ký lần từ chối (TC-03).</p>
 */
@RestController
@RequestMapping("/reports/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-01')")
public class DashboardController {

	private final DashboardService dashboardService;

	/** TC-01/TC-02: các chỉ số chính của kỳ; kỳ không có dữ liệu trả về toàn số 0. */
	@GetMapping
	public BaseRes<DashboardSummaryRes> summary(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return BaseRes.ok(dashboardService.getSummary(new ReportPeriodReq(from, to)));
	}
}
