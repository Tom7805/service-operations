package com.serviceops.modules.report.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.report.dto.response.TimesheetByEmployeeRes;
import com.serviceops.modules.report.service.TimesheetReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * NCL-11-CN-006 — Báo cáo giờ công theo nhân sự.
 *
 * <p>Chỉ Quản lý dự án (VT-02) được xem (TC-03) và chỉ thấy giờ công của dự án mình phụ trách (QTN-01).
 * {@code @PreAuthorize} chặn trước khi vào method nên mọi vai trò khác đều nhận 403, và
 * {@code GlobalExceptionHandler} cùng {@code AccessDeniedAuditRecorder} tự ghi nhật ký lần từ chối.</p>
 */
@RestController
@RequestMapping("/reports/timesheet")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-02')")
public class TimesheetReportController {

	private final TimesheetReportService timesheetReportService;

	/** TC-01: lưới giờ công người × dự án (có tính phí / không tính phí) trong khoảng ngày cho trước. */
	@GetMapping
	public BaseRes<TimesheetByEmployeeRes> report(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return BaseRes.ok(timesheetReportService.getReport(from, to));
	}
}
