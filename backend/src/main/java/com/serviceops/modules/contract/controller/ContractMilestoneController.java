package com.serviceops.modules.contract.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.contract.dto.request.MilestoneCreateReq;
import com.serviceops.modules.contract.dto.response.MilestoneRes;
import com.serviceops.modules.contract.service.ContractMilestoneService;
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
 * NCL-04-CN-003: Quan ly moc thanh toan cua hop dong.
 * Chi Ke toan (VT-05) duoc thao tac (TC-03) - ai khong co quyen se bi tu choi
 * (403) va duoc ghi nhat ky boi {@code ContractAccessDeniedAspect} (dung chung
 * pointcut voi ContractController vi cung nam trong goi controller cua hop dong).
 */
@RestController
@RequestMapping("/contracts/{contractId}/milestones")
@RequiredArgsConstructor
public class ContractMilestoneController {

	private final ContractMilestoneService contractMilestoneService;

	/**
	 * Khai bao/thay the toan bo danh sach moc thanh toan cua hop dong
	 * (NCL-04-CN-003, TC-01/02/04). Dieu kien bat dau: hop dong da khai bao
	 * loai hinh va gia tri (xem NCL-04-CN-002).
	 */
	@PostMapping
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<MilestoneRes>> replace(@PathVariable Long contractId,
			@Valid @RequestBody MilestoneCreateReq request) {
		return BaseRes.ok("Cap nhat moc thanh toan thanh cong",
				contractMilestoneService.replaceMilestones(contractId, request));
	}

	/** Danh sach moc thanh toan hien tai cua hop dong. */
	@GetMapping
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<MilestoneRes>> list(@PathVariable Long contractId) {
		return BaseRes.ok("Danh sach moc thanh toan", contractMilestoneService.list(contractId));
	}
}
