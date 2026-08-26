package com.serviceops.modules.customer.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

	private final CustomerService customerService;

	/** NCL-02-CN-001: chi Nhan vien kinh doanh (VT-04) hoac Quan ly du an (VT-02) duoc tao ho so khach hang. */
	@PostMapping
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<CustomerRes> create(@Valid @RequestBody CustomerCreateReq request) {
		return BaseRes.ok("Tao ho so khach hang thanh cong", customerService.create(request));
	}
}
