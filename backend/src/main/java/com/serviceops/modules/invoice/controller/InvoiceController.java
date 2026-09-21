package com.serviceops.modules.invoice.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.invoice.dto.request.InvoiceFromMilestoneReq;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;
import com.serviceops.modules.invoice.service.MilestoneInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class InvoiceController {

	private final MilestoneInvoiceService milestoneInvoiceService;

	/** NCL-10-CN-002: chi Ke toan (VT-05); vai tro khac nhan 403 va AccessDeniedAuditRecorder tu ghi log (TC-03). */
	@PostMapping("/contracts/{contractId}/milestones/{milestoneId}/invoice")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<InvoiceRes> createFromMilestone(@PathVariable Long contractId,
			@PathVariable Long milestoneId,
			@Valid @RequestBody(required = false) InvoiceFromMilestoneReq request) {
		return BaseRes.ok("Lap hoa don theo moc hop dong thanh cong",
				milestoneInvoiceService.createFromMilestone(contractId, milestoneId, request));
	}
}
