package com.serviceops.modules.opportunity.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.api.PageRes;
import com.serviceops.modules.opportunity.dto.response.OpportunityPageSummaryRes;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.service.OpportunityPageQueryService;

import lombok.RequiredArgsConstructor;

/**
 * Danh sach co hoi phan trang phia may chu cho man "Co hoi ban hang". Cung quyen voi
 * GET /opportunities (endpoint cu van giu cho bao cao duong ong va o chon co hoi).
 */
@RestController
@RequestMapping("/opportunities")
@RequiredArgsConstructor
public class OpportunityPageController {

	private final OpportunityPageQueryService opportunityPageQueryService;

	@GetMapping("/paged")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-04')")
	public BaseRes<PageRes<OpportunityRes, OpportunityPageSummaryRes>> list(
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) OpportunityStage stage,
			@RequestParam(required = false) Long id,
			@RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer size) {
		return BaseRes.ok(opportunityPageQueryService.findPage(keyword, stage, id, page, size));
	}
}
