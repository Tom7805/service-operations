package com.serviceops.modules.rate.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.rate.dto.request.RateLookupReq;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;
import com.serviceops.modules.rate.service.RateResolutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tra cuu don gia ap dung cho mot dong gio cong (NCL-07-CN-005, Epic NCL-07).
 *
 * <p>Cung nhom quyen voi cac endpoint tra cuu don gia khac ({@code /bill-rates/resolve},
 * {@code /contracts/{id}/bill-rates/resolve}) vi day cung la mot phan cua "quan ly hieu
 * luc cua don gia" phuc vu tinh doanh thu — chi Ke toan (VT-05) hoac Quan tri vien
 * (VT-07) duoc goi.</p>
 */
@RestController
@RequestMapping("/timesheet-entries")
@RequiredArgsConstructor
public class RateLookupController {

	private final RateResolutionService rateResolutionService;

	@GetMapping("/{entryId}/bill-rate/resolve")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<ResolvedRateRes> resolve(@PathVariable Long entryId, @RequestParam String level) {
		return BaseRes.ok(rateResolutionService.resolveForTimeEntry(entryId, new RateLookupReq(level)));
	}
}
