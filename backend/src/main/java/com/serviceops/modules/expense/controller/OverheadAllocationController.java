package com.serviceops.modules.expense.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.expense.dto.request.OverheadAllocationRunReq;
import com.serviceops.modules.expense.dto.response.OverheadAllocationRes;
import com.serviceops.modules.expense.service.OverheadAllocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** NCL-08-CN-005: phan bo chi phi chung cho cac du an theo ty trong gio cong da duyet. */
@RestController
@RequiredArgsConstructor
public class OverheadAllocationController {

	private final OverheadAllocationService overheadAllocationService;

	@PostMapping("/overhead-allocations/run")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<OverheadAllocationRes> run(@Valid @RequestBody OverheadAllocationRunReq request) {
		return BaseRes.ok("Phan bo chi phi chung thanh cong", overheadAllocationService.run(request));
	}
}
