package com.serviceops.modules.portal.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.portal.dto.request.PortalAcceptanceDecisionReq;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceRes;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceSummaryRes;
import com.serviceops.modules.portal.security.PortalOnly;
import com.serviceops.modules.portal.service.PortalAcceptanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** NCL-13-CN-003 — khach hang (VT-09) xem, xac nhan hoac tu choi phieu nghiem thu tren cong. */
@RestController
@RequestMapping("/portal/acceptances")
@RequiredArgsConstructor
@PortalOnly
public class PortalAcceptanceController {

	private final PortalAcceptanceService portalAcceptanceService;

	@GetMapping
	public BaseRes<List<PortalAcceptanceSummaryRes>> list(@RequestParam(required = false) Long projectId,
			@RequestParam(required = false) AcceptanceStatus status) {
		return BaseRes.ok(portalAcceptanceService.list(projectId, status));
	}

	@GetMapping("/{certificateId}")
	public BaseRes<PortalAcceptanceRes> get(@PathVariable Long certificateId) {
		return BaseRes.ok(portalAcceptanceService.get(certificateId));
	}

	/** TC-01: khach hang xac nhan nghiem thu. */
	@PostMapping("/{certificateId}/confirm")
	public BaseRes<PortalAcceptanceRes> confirm(@PathVariable Long certificateId) {
		return BaseRes.ok("Xac nhan nghiem thu thanh cong", portalAcceptanceService.confirm(certificateId));
	}

	/** TC-02: tu choi bat buoc kem ly do. */
	@PostMapping("/{certificateId}/reject")
	public BaseRes<PortalAcceptanceRes> reject(@PathVariable Long certificateId,
			@Valid @RequestBody PortalAcceptanceDecisionReq request) {
		return BaseRes.ok("Tu choi nghiem thu thanh cong", portalAcceptanceService.reject(certificateId, request));
	}
}
