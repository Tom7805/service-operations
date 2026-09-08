package com.serviceops.modules.contract.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;
import com.serviceops.modules.contract.service.ContractExpiryReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-04-CN-006: Nhac hop dong sap het hieu luc.
 * Chi Ke toan (VT-05) duoc thao tac (TC-03) - ai khong co quyen se bi tu choi
 * (403) va duoc ghi nhat ky boi {@code ContractAccessDeniedAspect} (dung
 * chung pointcut voi cac controller khac cua hop dong).
 */
@RestController
@RequestMapping("/contracts/expiry-reminders")
@RequiredArgsConstructor
public class ContractExpiryReminderController {

	private final ContractExpiryReminderService contractExpiryReminderService;

	/**
	 * Kich hoat thu cong tac vu ra soat va gui nhac hop dong sap het hieu luc
	 * (NCL-04-CN-006, TC-01/04). He thong cung tu chay tac vu nay hang ngay;
	 * API nay danh cho kiem tra/kich hoat lai khi can. Chong gui trung trong
	 * cung mot ngay theo QTN-27.
	 */
	@PostMapping("/run")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<ContractExpiryAlertRes>> run() {
		return BaseRes.ok("Da gui nhac hop dong sap het hieu luc",
				contractExpiryReminderService.runReminderScan());
	}

	/** Danh sach hop dong da het hieu luc nhung van dang ACTIVE, can xu ly gap (TC-02). */
	@GetMapping("/overdue")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<ContractExpiryAlertRes>> overdue() {
		return BaseRes.ok("Hop dong da het hieu luc nhung van dang chay",
				contractExpiryReminderService.listOverdueActiveContracts());
	}
}
