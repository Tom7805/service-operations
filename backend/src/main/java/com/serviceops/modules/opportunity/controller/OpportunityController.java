package com.serviceops.modules.opportunity.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.service.OpportunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-03-CN-001: Tao co hoi ban hang.
 * Chi Nhan vien kinh doanh (VT-04) duoc tao co hoi (TC-03) — ai khong co quyen
 * se bi tu choi (403) va duoc ghi nhat ky boi {@code OpportunityAccessDeniedAspect}.
 */
@RestController
@RequestMapping("/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

	private final OpportunityService opportunityService;

	/** Tao co hoi ban hang moi, gan voi khach hang da co ho so (TC-01). */
	@PostMapping
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<OpportunityRes> create(@Valid @RequestBody OpportunityCreateReq request) {
		return BaseRes.ok("Tao co hoi ban hang thanh cong", opportunityService.create(request));
	}
}
