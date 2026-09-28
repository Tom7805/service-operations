package com.serviceops.modules.profitability.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.profitability.dto.request.MarginThresholdReq;
import com.serviceops.modules.profitability.dto.response.MarginAlertRes;
import com.serviceops.modules.profitability.service.MarginAlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Nguong canh bao am bien (NCL-09-CN-004) - cau hinh toan cong ty, khong gan {@code projectId}
 * nen tach rieng khoi {@link ProjectProfitabilityController}.
 */
@RestController
@RequestMapping("/profitability/margin-alert-threshold")
@RequiredArgsConstructor
public class MarginAlertController {

	private final MarginAlertService marginAlertService;

	@GetMapping
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-05')")
	public BaseRes<MarginAlertRes> getThreshold() {
		return BaseRes.ok(marginAlertService.getThreshold());
	}

	/** TC-03: chi Ban giam doc (VT-01) duoc dat nguong; vai tro khac nhan 403 (AccessDeniedAuditRecorder tu ghi log). */
	@PutMapping
	@PreAuthorize("hasRole('VT-01')")
	public BaseRes<MarginAlertRes> setThreshold(@Valid @RequestBody MarginThresholdReq request) {
		return BaseRes.ok(marginAlertService.setThreshold(request));
	}
}
