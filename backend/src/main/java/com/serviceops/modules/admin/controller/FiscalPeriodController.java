package com.serviceops.modules.admin.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.admin.dto.response.FiscalPeriodRes;
import com.serviceops.modules.admin.service.FiscalPeriodService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * NCL-15-CN-002-TC-01: ky tai chinh chia theo cau hinh cong ty — chi doc, mo cho cac vai tro xem bao cao theo
 * nam/quy (ban giam doc, quan ly du an, ke toan) va quan tri vien.
 */
@RestController
@RequestMapping("/fiscal-periods")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('VT-07','VT-01','VT-02','VT-05')")
public class FiscalPeriodController {

	private final FiscalPeriodService fiscalPeriodService;

	/** Nam tai chinh chua ngay {@code date} (mac dinh hom nay). */
	@GetMapping("/current")
	public BaseRes<FiscalPeriodRes> current(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return BaseRes.ok(fiscalPeriodService.resolve(date));
	}

	@GetMapping("/{fiscalYear}")
	public BaseRes<FiscalPeriodRes> fiscalYear(@PathVariable int fiscalYear) {
		return BaseRes.ok(fiscalPeriodService.getFiscalYear(fiscalYear));
	}
}
