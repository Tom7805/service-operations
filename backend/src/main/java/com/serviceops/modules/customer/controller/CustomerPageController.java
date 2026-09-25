package com.serviceops.modules.customer.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.api.PageRes;
import com.serviceops.modules.customer.dto.request.CustomerPageReq;
import com.serviceops.modules.customer.dto.response.CustomerPageSummaryRes;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.service.CustomerPageQueryService;

import lombok.RequiredArgsConstructor;

/**
 * Danh sach khach hang phan trang phia may chu cho man "Quan ly khach hang". Cung quyen voi
 * GET /customers (endpoint cu van giu nguyen cho cac o chon/tim kiem dang dung toan bo danh sach).
 */
@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerPageController {

	private final CustomerPageQueryService customerPageQueryService;

	@GetMapping("/paged")
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02') or hasRole('VT-07')")
	public BaseRes<PageRes<CustomerRes, CustomerPageSummaryRes>> list(CustomerPageReq request) {
		return BaseRes.ok(customerPageQueryService.findPage(request));
	}
}
