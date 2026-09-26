package com.serviceops.modules.admin.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.admin.dto.request.CompanySettingReq;
import com.serviceops.modules.admin.dto.response.CompanySettingRes;
import com.serviceops.modules.admin.service.CompanySettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-15-CN-002 — chi Quan tri vien (VT-07) xem va sua cau hinh cong ty. Vai tro khac nhan 403 va
 * {@code AccessDeniedAuditRecorder} ghi "Tu choi truy cap — Cấu hình công ty" (TC-03).
 */
@RestController
@RequestMapping("/company-settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class CompanySettingController {

	private final CompanySettingService companySettingService;

	@GetMapping
	public BaseRes<CompanySettingRes> get() {
		return BaseRes.ok(companySettingService.get());
	}

	/** TC-01 / TC-02. */
	@PutMapping
	public BaseRes<CompanySettingRes> update(@Valid @RequestBody CompanySettingReq request) {
		return BaseRes.ok("Luu cau hinh cong ty thanh cong", companySettingService.update(request));
	}
}
