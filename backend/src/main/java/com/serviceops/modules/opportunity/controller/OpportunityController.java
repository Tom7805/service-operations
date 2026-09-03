package com.serviceops.modules.opportunity.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.request.StageChangeReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.StageHistoryRes;
import com.serviceops.modules.opportunity.service.OpportunityService;
import com.serviceops.modules.opportunity.service.OpportunityStageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
	private final OpportunityStageService opportunityStageService;

	/** Tao co hoi ban hang moi, gan voi khach hang da co ho so (TC-01). */
	@PostMapping
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<OpportunityRes> create(@Valid @RequestBody OpportunityCreateReq request) {
		return BaseRes.ok("Tao co hoi ban hang thanh cong", opportunityService.create(request));
	}

	/** Chuyen giai doan co hoi (NCL-03-CN-002, TC-01/02/03/05). Chi Nhan vien kinh doanh. */
	@PatchMapping("/{opportunityId}/stage")
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<OpportunityRes> changeStage(@PathVariable Long opportunityId,
			@Valid @RequestBody StageChangeReq request) {
		return BaseRes.ok("Chuyen giai doan co hoi thanh cong",
				opportunityStageService.changeStage(new StageChangeReq(
						opportunityId != null ? opportunityId : request.opportunityId(),
						request.targetStage())));
	}

	/** Lich su chuyen giai doan cua mot co hoi (NCL-03-CN-002, TC-05). */
	@GetMapping("/{opportunityId}/stage-history")
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<List<StageHistoryRes>> stageHistory(@PathVariable Long opportunityId) {
		return BaseRes.ok(opportunityStageService.history(opportunityId));
	}
}
