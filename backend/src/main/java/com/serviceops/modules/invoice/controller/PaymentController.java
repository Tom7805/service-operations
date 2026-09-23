package com.serviceops.modules.invoice.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.invoice.dto.request.PaymentCreateReq;
import com.serviceops.modules.invoice.dto.response.PaymentItemRes;
import com.serviceops.modules.invoice.dto.response.PaymentRes;
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.invoice.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PaymentController {

	private final PaymentService paymentService;
	private final InvoiceService invoiceService;

	/** NCL-10-CN-003: lich su cac lan thanh toan cua mot hoa don, ngay thanh toan moi nhat truoc. */
	@GetMapping("/invoices/{invoiceId}/payments")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<PaymentItemRes>> listPayments(@PathVariable Long invoiceId) {
		return BaseRes.ok(invoiceService.listPayments(invoiceId));
	}

	/** NCL-10-CN-003: chi Ke toan (VT-05); vai tro khac nhan 403 va AccessDeniedAuditRecorder tu ghi log (TC-04). */
	@PostMapping("/invoices/{invoiceId}/payments")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<PaymentRes> recordPayment(@PathVariable Long invoiceId,
			@Valid @RequestBody PaymentCreateReq request) {
		return BaseRes.ok("Ghi nhan thanh toan cua khach hang thanh cong",
				paymentService.recordPayment(invoiceId, request));
	}
}
