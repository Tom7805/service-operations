package com.serviceops.modules.contract.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.api.PageRes;
import com.serviceops.modules.contract.dto.response.ContractPageSummaryRes;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.service.ContractPageQueryService;

import lombok.RequiredArgsConstructor;

/**
 * Danh sach hop dong phan trang phia may chu cho man "Hop dong". Cung quyen voi GET /contracts
 * (endpoint cu van giu cho o chon hop dong o man Don gia). Tu choi quyen van duoc
 * {@code ContractAccessDeniedAspect} ghi nhat ky (pointcut theo ca package controller).
 */
@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
public class ContractPageController {

	private final ContractPageQueryService contractPageQueryService;

	@GetMapping("/paged")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<PageRes<ContractRes, ContractPageSummaryRes>> list(
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) ContractStatus status,
			@RequestParam(defaultValue = "true") boolean includeSummary,
			@RequestParam(required = false) Integer page,
			@RequestParam(required = false) Integer size) {
		return BaseRes.ok(contractPageQueryService.findPage(keyword, status, includeSummary, page, size));
	}
}
