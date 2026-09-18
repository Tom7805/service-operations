package com.serviceops.modules.profitability.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.profitability.dto.request.ProfitQueryReq;
import com.serviceops.modules.profitability.dto.response.MarginByCustomerRes;
import com.serviceops.modules.profitability.dto.response.MarginByEmployeeRes;
import com.serviceops.modules.profitability.service.MarginReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * NCL-09-CN-005 — Báo cáo biên lợi nhuận theo khách hàng và theo nhân sự.
 *
 * <p>Chỉ Ban giám đốc (VT-01) được xem hai báo cáo này (đúng vai trò của user story; TC-02 yêu cầu
 * Quản lý dự án bị từ chối truy cập báo cáo theo nhân sự — {@code @PreAuthorize} chặn trước khi vào
 * method nên mọi vai trò khác đều bị từ chối như nhau, và {@code GlobalExceptionHandler} cùng
 * {@code AccessDeniedAuditRecorder} tự ghi nhật ký lần từ chối, QTN-01/QTN-03/TC-03).</p>
 */
@RestController
@RequestMapping("/reports/margin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-01')")
public class ProfitAnalysisController {

	private final MarginReportService marginReportService;

	/** NCL-09-CN-005-TC-01: biên lợi nhuận gộp theo từng khách hàng trong kỳ. */
	@GetMapping("/by-customer")
	public BaseRes<MarginByCustomerRes> marginByCustomer(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return BaseRes.ok(marginReportService.marginByCustomer(new ProfitQueryReq(from, to)));
	}

	/** NCL-09-CN-005-TC-02: biên lợi nhuận gộp theo từng nhân sự trong kỳ. */
	@GetMapping("/by-employee")
	public BaseRes<MarginByEmployeeRes> marginByEmployee(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return BaseRes.ok(marginReportService.marginByEmployee(new ProfitQueryReq(from, to)));
	}
}
