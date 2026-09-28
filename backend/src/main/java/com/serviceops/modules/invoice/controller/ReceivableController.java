package com.serviceops.modules.invoice.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes;
import com.serviceops.modules.invoice.enums.AgingBucket;
import com.serviceops.modules.invoice.service.ReceivableService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ReceivableController {

	static final String NO_OVERDUE_MESSAGE = "Khong co cong no qua han";

	private final ReceivableService receivableService;

	/**
	 * NCL-10-CN-004: danh sach hoa don qua han phan nhom theo so ngay qua han. Chi Ke toan (VT-05); vai tro
	 * khac nhan 403 va AccessDeniedAuditRecorder tu ghi log (TC-03). Khong co cong no qua han van tra 200 kem
	 * thong bao (TC-02).
	 */
	@GetMapping("/receivables/overdue")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<ReceivableAgingRes> overdue(@RequestParam(required = false) Long customerId,
			@RequestParam(required = false) AgingBucket bucket) {
		ReceivableAgingRes result = receivableService.getOverdue(customerId, bucket);
		return result.totalInvoiceCount() == 0
				? BaseRes.ok(NO_OVERDUE_MESSAGE, result)
				: BaseRes.ok(result);
	}
}
