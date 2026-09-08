package com.serviceops.modules.contract.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.contract.dto.request.ContractUsageReq;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;
import com.serviceops.modules.contract.service.ContractLimitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-04-CN-005: Canh bao khi sap vuot han muc hop dong.
 * Quan ly du an (VT-02) va Ke toan (VT-05) duoc thao tac (TC-03) - ai khong
 * co quyen se bi tu choi (403) va duoc ghi nhat ky boi {@code
 * ContractAccessDeniedAspect} (dung chung pointcut voi cac controller khac
 * cua hop dong).
 */
@RestController
@RequestMapping("/contracts/{contractId}/usage")
@RequiredArgsConstructor
public class ContractLimitController {

	private final ContractLimitService contractLimitService;

	/** Tinh trang han muc va gia tri da dung hien tai cua hop dong. Dieu kien bat dau: hop dong da co han muc. */
	@GetMapping
	@PreAuthorize("hasAnyRole('VT-02','VT-05')")
	public BaseRes<ContractUsageRes> getUsage(@PathVariable Long contractId) {
		return BaseRes.ok("Tinh trang han muc hop dong", contractLimitService.getUsage(contractId));
	}

	/**
	 * Ghi nhan gia tri phat sinh tu gio cong da duyet hoac hoa don da lap
	 * (NCL-04-CN-005, TC-01/02/04).
	 */
	@PostMapping
	@PreAuthorize("hasAnyRole('VT-02','VT-05')")
	public BaseRes<ContractUsageRes> recordUsage(@PathVariable Long contractId,
			@Valid @RequestBody ContractUsageReq request) {
		return BaseRes.ok("Ghi nhan gia tri phat sinh thanh cong",
				contractLimitService.recordUsage(contractId, request));
	}
}
