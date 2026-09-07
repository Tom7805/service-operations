package com.serviceops.modules.contract.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.contract.dto.request.ContractTypeLimitReq;
import com.serviceops.modules.contract.dto.request.ContractMilestoneReq;
import com.serviceops.modules.contract.dto.response.ContractMilestoneRes;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.contract.service.ContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-04-CN-002: Khai bao loai hop dong va han muc.
 * Chi Ke toan (VT-05) duoc khai bao (TC-03) - ai khong co quyen se bi tu choi
 * (403) va duoc ghi nhat ky boi {@code ContractAccessDeniedAspect}.
 */
@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
public class ContractController {

private final ContractService contractService;
private final ContractMilestoneService contractMilestoneService;

/**
 * Khai bao loai hop dong (tron goi/theo gio/theo moc), gia tri va han muc tran
 * (NCL-04-CN-002, TC-01/02/04, QTN-19). Dieu kien bat dau: hop dong da duoc tao.
 */
@PatchMapping("/{contractId}/type-limit")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<ContractRes> updateTypeAndLimit(@PathVariable Long contractId,
@Valid @RequestBody ContractTypeLimitReq request) {
return BaseRes.ok("Khai bao loai hop dong va han muc thanh cong",
contractService.updateTypeAndLimit(contractId, request));
}

/** NCL-04-CN-003: xem danh sach moc thanh toan cua hop dong. */
@GetMapping("/{contractId}/milestones")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<List<ContractMilestoneRes>> listMilestones(@PathVariable Long contractId) {
return BaseRes.ok(contractMilestoneService.list(contractId));
}

/** NCL-04-CN-003: thay the tron bo danh sach moc, dam bao tong bang gia tri hop dong. */
@PutMapping("/{contractId}/milestones")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<List<ContractMilestoneRes>> replaceMilestones(@PathVariable Long contractId,
	@Valid @RequestBody List<@Valid ContractMilestoneReq> requests) {
return BaseRes.ok("Khai bao moc thanh toan thanh cong",
contractMilestoneService.replace(contractId, requests));
}
}