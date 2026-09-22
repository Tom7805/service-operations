package com.serviceops.modules.invoice.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.invoice.dto.request.DunningRunReq;
import com.serviceops.modules.invoice.dto.response.DunningLogRes;
import com.serviceops.modules.invoice.dto.response.DunningRunRes;
import com.serviceops.modules.invoice.service.DunningService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-10-CN-006: nhắc thu nợ tự động. Toàn bộ chức năng chỉ dành cho Kế toán (VT-05) — vai trò khác
 * nhận 403 FORBIDDEN và bị ghi Nhật ký hệ thống lần từ chối (TC-03).
 */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-05')")
public class DunningController {

	private final DunningService dunningService;

	/** Chạy rà soát nhắc thu nợ cho mọi hóa đơn còn công nợ (TC-01/TC-02). */
	@PostMapping("/dunning/run")
	public BaseRes<DunningRunRes> run(@RequestBody(required = false) DunningRunReq request) {
		return BaseRes.ok("Ra soat nhac thu no thanh cong", dunningService.run(request));
	}

	@GetMapping("/invoices/{invoiceId}/dunning-logs")
	public BaseRes<List<DunningLogRes>> history(@PathVariable Long invoiceId) {
		return BaseRes.ok(dunningService.history(invoiceId));
	}
}
