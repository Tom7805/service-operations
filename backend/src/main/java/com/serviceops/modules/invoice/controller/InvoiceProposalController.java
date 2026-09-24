package com.serviceops.modules.invoice.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.invoice.dto.request.InvoiceFromProposalReq;
import com.serviceops.modules.invoice.dto.request.InvoiceProposalCreateReq;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalSkippedRes;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;
import com.serviceops.modules.invoice.service.InvoiceProposalService;
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
public class InvoiceProposalController {

	private final InvoiceProposalService invoiceProposalService;

	/**
	 * NCL-10-CN-001: chi Ke toan (VT-05); vai tro khac nhan 403 va AccessDeniedAuditRecorder tu ghi log (TC-04).
	 * {@code message} neu ro so dong gio cong bi bo qua de ke toan thay ngay ma khong phai doc {@code data.skipped} (TC-02).
	 */
	@PostMapping("/projects/{projectId}/invoice-proposals")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<InvoiceProposalRes> create(@PathVariable Long projectId,
			@Valid @RequestBody InvoiceProposalCreateReq request) {
		InvoiceProposalRes proposal = invoiceProposalService.createFromApprovedTimesheets(projectId, request);
		return BaseRes.ok(message(proposal.skipped()), proposal);
	}

	/**
	 * Toan bo de nghi xuat hoa don (moi trang thai) cua mot hop dong — man "Hop dong" cua Ke toan can xem lai
	 * de nghi da tao (kha PENDING chua chuyen thanh hoa don) sau khi tai lai trang, thay vi chi thay ket qua
	 * tuc thoi ngay sau khi bam tao.
	 */
	@GetMapping("/contracts/{contractId}/invoice-proposals")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<InvoiceProposalRes>> listByContract(@PathVariable Long contractId) {
		return BaseRes.ok(invoiceProposalService.listByContract(contractId));
	}

	/** Chuyen mot de nghi dang PENDING thanh hoa don chinh thuc (buoc tiep theo sau khi tao de nghi). */
	@PostMapping("/invoice-proposals/{proposalId}/invoice")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<InvoiceRes> convertToInvoice(@PathVariable Long proposalId,
			@Valid @RequestBody(required = false) InvoiceFromProposalReq request) {
		return BaseRes.ok("Lap hoa don tu de nghi thanh cong", invoiceProposalService.convertToInvoice(proposalId, request));
	}

	/** Huy mot de nghi dang PENDING — giai phong gio cong/chi phi de gom lai o de nghi sau. */
	@PostMapping("/invoice-proposals/{proposalId}/cancel")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<InvoiceProposalRes> cancel(@PathVariable Long proposalId) {
		return BaseRes.ok("Da huy de nghi xuat hoa don", invoiceProposalService.cancelProposal(proposalId));
	}

	private String message(InvoiceProposalSkippedRes skipped) {
		String message = "Tao de nghi xuat hoa don thanh cong";
		if (skipped.total() == 0) {
			return message;
		}
		return message + ": bo qua " + skipped.total() + " dong gio cong (" + skipped.notApprovedCount()
				+ " chua duyet, " + skipped.nonBillableCount() + " khong tinh phi, " + skipped.alreadyProposedCount()
				+ " da nam trong de nghi truoc, " + skipped.missingRateCount() + " chua co don gia)";
	}
}
