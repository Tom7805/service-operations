package com.serviceops.modules.portal.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.portal.dto.response.PortalDebtSummaryRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceDetailRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceRes;
import com.serviceops.modules.portal.security.PortalOnly;
import com.serviceops.modules.portal.service.PortalInvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** NCL-13-CN-004 — khach hang (VT-09) xem hoa don va cong no cua chinh minh tren cong. */
@RestController
@RequestMapping("/portal/invoices")
@RequiredArgsConstructor
@PortalOnly
public class PortalInvoiceController {

	private final PortalInvoiceService portalInvoiceService;

	/** TC-01: hoa don kem so con phai tra va han thanh toan. */
	@GetMapping
	public BaseRes<List<PortalInvoiceRes>> list(@RequestParam(required = false) InvoiceStatus status,
			@RequestParam(required = false) Boolean overdueOnly) {
		return BaseRes.ok(portalInvoiceService.list(status, overdueOnly));
	}

	@GetMapping("/summary")
	public BaseRes<PortalDebtSummaryRes> summary() {
		return BaseRes.ok(portalInvoiceService.summary());
	}

	/** TC-02: hoa don cua khach hang khac -> 403. */
	@GetMapping("/{invoiceId}")
	public BaseRes<PortalInvoiceDetailRes> get(@PathVariable Long invoiceId) {
		return BaseRes.ok(portalInvoiceService.get(invoiceId));
	}
}
