package com.serviceops.modules.portal.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.portal.dto.request.PortalAccountCreateReq;
import com.serviceops.modules.portal.dto.request.PortalAccountStatusReq;
import com.serviceops.modules.portal.dto.response.PortalAccountRes;
import com.serviceops.modules.portal.dto.response.PortalContactCandidateRes;
import com.serviceops.modules.portal.service.PortalAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-13-CN-001 — Quan tri vien (VT-07) cap va quan ly tai khoan cong khach hang. Vai tro khac nhan 403 va
 * {@code AccessDeniedAuditRecorder} ghi "Tu choi truy cap — Cap tai khoan cong khach hang" (TC-03).
 */
@RestController
@RequestMapping("/portal-accounts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class PortalAccountController {

	private final PortalAccountService portalAccountService;

	/** Nguoi lien he cua khach hang kem tai khoan cong da cap — de chon nguoi duoc cap (TC-01). */
	@GetMapping("/candidates")
	public BaseRes<List<PortalContactCandidateRes>> listCandidates(@RequestParam Long customerId) {
		return BaseRes.ok(portalAccountService.listCandidates(customerId));
	}

	/** TC-01: cap tai khoan cho mot nguoi lien he. */
	@PostMapping
	public BaseRes<PortalAccountRes> create(@Valid @RequestBody PortalAccountCreateReq request) {
		return BaseRes.ok("Cap tai khoan cong khach hang thanh cong", portalAccountService.create(request));
	}

	@GetMapping
	public BaseRes<List<PortalAccountRes>> search(@RequestParam(required = false) Long customerId,
			@RequestParam(required = false) UserStatus status) {
		return BaseRes.ok(portalAccountService.search(customerId, status));
	}

	@GetMapping("/{accountId}")
	public BaseRes<PortalAccountRes> get(@PathVariable Long accountId) {
		return BaseRes.ok(portalAccountService.get(accountId));
	}

	/** TC-02: khoa (nguoi lien he nghi viec) hoac mo lai tai khoan cong. */
	@PatchMapping("/{accountId}/status")
	public BaseRes<PortalAccountRes> updateStatus(@PathVariable Long accountId,
			@Valid @RequestBody PortalAccountStatusReq request) {
		PortalAccountRes result = portalAccountService.updateStatus(accountId, request);
		return BaseRes.ok(request.status() == UserStatus.LOCKED ? "Khoa tai khoan cong thanh cong"
				: "Mo khoa tai khoan cong thanh cong", result);
	}
}
