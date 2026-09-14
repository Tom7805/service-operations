package com.serviceops.modules.opportunity.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.opportunity.dto.request.ActivityCreateReq;
import com.serviceops.modules.opportunity.dto.response.ActivityRes;
import com.serviceops.modules.opportunity.service.OpportunityActivityService;
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

@RestController
@RequestMapping("/opportunities/{opportunityId}/activities")
@RequiredArgsConstructor
public class OpportunityActivityController {

	private final OpportunityActivityService opportunityActivityService;

	/** NCL-03-CN-006: dong thoi gian cham soc cua co hoi, xem duoc ke ca khi co hoi da dong (TC-02). */
	@GetMapping
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<List<ActivityRes>> list(@PathVariable Long opportunityId) {
		return BaseRes.ok(opportunityActivityService.listByOpportunity(opportunityId));
	}

	/** NCL-03-CN-006: chi Nhan vien kinh doanh (VT-04) duoc ghi nhan hoat dong cham soc (TC-01, TC-03). */
	@PostMapping
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<ActivityRes> add(@PathVariable Long opportunityId,
			@Valid @RequestBody ActivityCreateReq request) {
		return BaseRes.ok("Ghi nhan hoat dong cham soc thanh cong",
				opportunityActivityService.addActivity(opportunityId, request));
	}
}
