package com.serviceops.modules.rate.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.rate.dto.request.EmployeeHourlyRateCreateReq;
import com.serviceops.modules.rate.dto.response.EmployeeHourlyRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/employees/{employeeId}/rates")
@RequiredArgsConstructor
public class EmployeeHourlyRateController {

	private final EmployeeHourlyRateService employeeHourlyRateService;

	@PostMapping
	@PreAuthorize("hasRole('VT-06') or hasRole('VT-07')")
	public BaseRes<EmployeeHourlyRateRes> create(@PathVariable Long employeeId,
												 @Valid @RequestBody EmployeeHourlyRateCreateReq request) {
		return BaseRes.ok("Khai bao chi phi gio cong noi bo thanh cong",
				employeeHourlyRateService.create(employeeId, request));
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('VT-01', 'VT-05', 'VT-06', 'VT-07')")
	public BaseRes<List<EmployeeHourlyRateRes>> listByEmployee(@PathVariable Long employeeId) {
		return BaseRes.ok(employeeHourlyRateService.listByEmployee(employeeId));
	}

	@GetMapping("/resolve")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-05', 'VT-06', 'VT-07')")
	public BaseRes<ResolvedEmployeeHourlyRateRes> resolve(
			@PathVariable Long employeeId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
		return BaseRes.ok(employeeHourlyRateService.resolve(employeeId, asOf));
	}
}

