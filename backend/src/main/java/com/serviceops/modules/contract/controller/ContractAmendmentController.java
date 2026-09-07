package com.serviceops.modules.contract.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.contract.dto.request.AmendmentCreateReq;
import com.serviceops.modules.contract.dto.response.AmendmentRes;
import com.serviceops.modules.contract.service.ContractAmendmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-04-CN-004: Lap phu luc dieu chinh hop dong.
 * Chi Ke toan (VT-05) duoc thao tac (TC-03) - ai khong co quyen se bi tu choi
 * (403) va duoc ghi nhat ky boi {@code ContractAccessDeniedAspect} (dung chung
 * pointcut voi ContractController vi cung nam trong goi controller cua hop dong).
 */
@RestController
@RequestMapping("/contracts/{contractId}/amendments")
@RequiredArgsConstructor
public class ContractAmendmentController {

	private final ContractAmendmentService contractAmendmentService;

	/**
	 * Lap phu luc dieu chinh gia tri va/hoac thoi han hop dong (NCL-04-CN-004,
	 * TC-01/02/04). Dieu kien bat dau: hop dong da khai bao loai hinh va gia tri
	 * (xem NCL-04-CN-002). Moi lan goi la THEM MOI mot phu luc, khong thay the
	 * phu luc cu.
	 */
	@PostMapping
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<AmendmentRes> create(@PathVariable Long contractId,
			@Valid @RequestBody AmendmentCreateReq request) {
		return BaseRes.ok("Lap phu luc dieu chinh hop dong thanh cong",
				contractAmendmentService.create(contractId, request));
	}

	/** Lich su phu luc cua hop dong, moi lap gan nhat hien truoc. */
	@GetMapping
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<AmendmentRes>> list(@PathVariable Long contractId) {
		return BaseRes.ok("Lich su phu luc hop dong", contractAmendmentService.list(contractId));
	}
}
