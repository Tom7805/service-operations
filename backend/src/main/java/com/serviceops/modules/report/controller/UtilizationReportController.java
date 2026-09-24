package com.serviceops.modules.report.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.UtilizationRes;
import com.serviceops.modules.report.service.UtilizationReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * NCL-11-CN-002 — Báo cáo tỷ lệ giờ tính phí.
 *
 * <p>Chỉ Ban giám đốc (VT-01) được xem (TC-04). {@code @PreAuthorize} chặn trước khi vào method nên mọi vai trò
 * khác đều nhận 403, và {@code GlobalExceptionHandler} cùng {@code AccessDeniedAuditRecorder} tự ghi nhật ký lần
 * từ chối.</p>
 */
@RestController
@RequestMapping("/reports/utilization")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-01')")
public class UtilizationReportController {

	private final UtilizationReportService utilizationReportService;

	/** TC-01 đến TC-03: tỷ lệ giờ tính phí của kỳ theo toàn công ty, từng bộ phận và từng người. */
	@GetMapping
	public BaseRes<UtilizationRes> report(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return BaseRes.ok(utilizationReportService.getReport(new ReportPeriodReq(from, to)));
	}
}
