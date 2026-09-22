package com.serviceops.modules.invoice.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.invoice.dto.request.RecurringInvoiceRunReq;
import com.serviceops.modules.invoice.dto.request.RecurringScheduleReq;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRunRes;
import com.serviceops.modules.invoice.dto.response.RecurringScheduleRes;
import com.serviceops.modules.invoice.service.RecurringInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-10-CN-005: hoa don dinh ky cho hop dong duy tri. Toan bo chuc nang chi danh cho Ke toan
 * (VT-05) — vai tro khac nhan 403 FORBIDDEN va bi ghi Nhat ky he thong lan tu choi (TC-03).
 */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-05')")
public class RecurringInvoiceController {

	private final RecurringInvoiceService recurringInvoiceService;

	@PostMapping("/contracts/{contractId}/recurring-invoice-schedule")
	public BaseRes<RecurringScheduleRes> createSchedule(@PathVariable Long contractId,
			@Valid @RequestBody RecurringScheduleReq request) {
		return BaseRes.ok("Khai bao dieu khoan lap hoa don dinh ky thanh cong",
				recurringInvoiceService.createSchedule(contractId, request));
	}

	@PutMapping("/contracts/{contractId}/recurring-invoice-schedule")
	public BaseRes<RecurringScheduleRes> updateSchedule(@PathVariable Long contractId,
			@Valid @RequestBody RecurringScheduleReq request) {
		return BaseRes.ok("Cap nhat dieu khoan lap hoa don dinh ky thanh cong",
				recurringInvoiceService.updateSchedule(contractId, request));
	}

	@GetMapping("/contracts/{contractId}/recurring-invoice-schedule")
	public BaseRes<RecurringScheduleRes> getSchedule(@PathVariable Long contractId) {
		return BaseRes.ok(recurringInvoiceService.getSchedule(contractId));
	}

	/** Chay ra soat lap hoa don dinh ky cho moi dieu khoan den ngay (TC-01/TC-02). */
	@PostMapping("/recurring-invoices/run")
	public BaseRes<RecurringInvoiceRunRes> run(@RequestBody(required = false) RecurringInvoiceRunReq request) {
		return BaseRes.ok("Ra soat lap hoa don dinh ky thanh cong", recurringInvoiceService.run(request));
	}
}
