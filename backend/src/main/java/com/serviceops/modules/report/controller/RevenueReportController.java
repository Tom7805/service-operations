package com.serviceops.modules.report.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.report.dto.request.RevenueReportReq;
import com.serviceops.modules.report.dto.response.MonthlyRevenueReportRes;
import com.serviceops.modules.report.service.RevenueReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

/**
 * NCL-11-CN-005 — Báo cáo doanh thu theo tháng.
 *
 * <p>Chỉ Ban giám đốc (VT-01) và Kế toán (VT-05) được xem (TC-03). {@code @PreAuthorize} chặn trước khi vào method nên
 * mọi vai trò khác đều nhận 403, và {@code GlobalExceptionHandler} cùng {@code AccessDeniedAuditRecorder} tự ghi nhật
 * ký lần từ chối.</p>
 */
@RestController
@RequestMapping("/reports/revenue")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('VT-01', 'VT-05')")
public class RevenueReportController {

	private final RevenueReportService revenueReportService;

	/** TC-01/TC-02: doanh thu từng tháng của kỳ, tách theo loại hợp đồng, so với cùng kỳ năm trước. */
	@GetMapping("/monthly")
	public BaseRes<MonthlyRevenueReportRes> monthly(
			@RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth fromMonth,
			@RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth toMonth) {
		return BaseRes.ok(revenueReportService.getMonthlyRevenue(new RevenueReportReq(fromMonth, toMonth)));
	}
}
