package com.serviceops.modules.contract.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.contract.dto.request.ContractAppendixCreateReq;
import com.serviceops.modules.contract.dto.request.ContractTypeLimitReq;
import com.serviceops.modules.contract.dto.request.ContractMilestoneReq;
import com.serviceops.modules.contract.dto.request.ContractMilestoneStatusReq;
import com.serviceops.modules.contract.dto.request.RenewalCreateReq;
import com.serviceops.modules.contract.dto.response.ContractAppendixRes;
import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;
import com.serviceops.modules.contract.dto.response.ContractMilestoneRes;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;
import com.serviceops.modules.contract.dto.response.RenewalRes;
import com.serviceops.modules.contract.service.ContractExpiryReminderService;
import com.serviceops.modules.contract.service.ContractLimitService;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.contract.service.ContractAppendixService;
import com.serviceops.modules.contract.service.ContractRenewalService;
import com.serviceops.modules.contract.service.ContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
private final ContractAppendixService contractAppendixService;
private final ContractLimitService contractLimitService;
private final ContractExpiryReminderService contractExpiryReminderService;
private final ContractRenewalService contractRenewalService;

/** NCL-04-CN-004: lap phu luc dieu chinh hop dong. */
@PostMapping("/{contractId}/appendices")
@PreAuthorize("hasRole('VT-04')")
public BaseRes<ContractAppendixRes> createAppendix(@PathVariable Long contractId,
		@Valid @RequestBody ContractAppendixCreateReq request) {
	return BaseRes.ok("Lap phu luc dieu chinh hop dong thanh cong",
			contractAppendixService.create(contractId, request));
}

/** NCL-04-CN-004: xem lich su phu luc cua hop dong. */
@GetMapping("/{contractId}/appendices")
@PreAuthorize("hasRole('VT-04')")
public BaseRes<List<ContractAppendixRes>> listAppendices(@PathVariable Long contractId) {
	return BaseRes.ok(contractAppendixService.list(contractId));
}

/**
 * Xem chi tiet mot hop dong - phuc vu man hinh khai bao loai/han muc can nap
 * san gia tri hien tai truoc khi sua (NCL-04-CN-002).
 */
@GetMapping("/{contractId}")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<ContractRes> getContract(@PathVariable Long contractId) {
	return BaseRes.ok(contractService.getById(contractId));
}

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

/**
 * NCL-04-CN-003: doi trang thai mot moc thanh toan (PENDING -> READY_TO_INVOICE
 * -> INVOICED). Dung de danh dau moc da duoc xuat hoa don khi he thong chua co
 * module hoa don rieng (Epic NCL-10) - so lieu nay la dau vao truc tiep cho
 * canh bao han muc o NCL-04-CN-005.
 */
@PatchMapping("/{contractId}/milestones/{milestoneId}/status")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<ContractMilestoneRes> updateMilestoneStatus(@PathVariable Long contractId,
		@PathVariable Long milestoneId, @Valid @RequestBody ContractMilestoneStatusReq request) {
	return BaseRes.ok("Cap nhat trang thai moc thanh toan thanh cong",
			contractMilestoneService.updateStatus(contractId, milestoneId, request.status()));
}

/**
 * NCL-04-CN-002: kich hoat hop dong tu DRAFT sang ACTIVE, dieu kien bat buoc
 * truoc khi dung duoc phu luc dieu chinh (NCL-04-CN-004) va gia han (NCL-04-CN-007).
 */
@PostMapping("/{contractId}/activate")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<ContractRes> activate(@PathVariable Long contractId) {
	return BaseRes.ok("Kich hoat hop dong thanh cong", contractService.activate(contractId));
}

/**
 * NCL-04-CN-005: muc do da su dung han muc tran cua hop dong, dung de Quan
 * ly du an biet khi nao sap cham nguong canh bao (TC-01) hoac da vuot (TC-02).
 */
@GetMapping("/{contractId}/usage")
@PreAuthorize("hasRole('VT-02') or hasRole('VT-05')")
public BaseRes<ContractUsageRes> getUsage(@PathVariable Long contractId) {
return BaseRes.ok(contractLimitService.getUsage(contractId));
}

/**
 * NCL-04-CN-006: danh sach hop dong dang hieu luc sap het han trong vong
 * {@code days} ngay (mac dinh 30), dung nhac Ke toan gia han truoc han.
 */
@GetMapping("/expiring")
@PreAuthorize("hasRole('VT-05')")
public BaseRes<List<ContractExpiryAlertRes>> listExpiringSoon(
		@RequestParam(name = "days", defaultValue = "30") int days) {
return BaseRes.ok(contractExpiryReminderService.findExpiringSoon(days));
}

/** NCL-04-CN-007: gia han hop dong dang hieu luc. */
@PostMapping("/{contractId}/renewals")
@PreAuthorize("hasRole('VT-04')")
public BaseRes<RenewalRes> createRenewal(@PathVariable Long contractId,
		@Valid @RequestBody RenewalCreateReq request) {
return BaseRes.ok("Gia han hop dong thanh cong",
contractRenewalService.create(contractId, request));
}

/** NCL-04-CN-007: xem lich su gia han cua hop dong. */
@GetMapping("/{contractId}/renewals")
@PreAuthorize("hasRole('VT-04')")
public BaseRes<List<RenewalRes>> listRenewals(@PathVariable Long contractId) {
return BaseRes.ok(contractRenewalService.list(contractId));
}
}
