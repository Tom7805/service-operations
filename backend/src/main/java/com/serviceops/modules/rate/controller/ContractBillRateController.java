package com.serviceops.modules.rate.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.rate.dto.request.ContractBillRateCreateReq;
import com.serviceops.modules.rate.dto.response.ContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.service.ContractBillRateService;
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
@RequestMapping("/contracts/{contractId}/bill-rates")
@RequiredArgsConstructor
public class ContractBillRateController {

	private final ContractBillRateService contractBillRateService;

	@PostMapping
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<ContractBillRateRes> create(@PathVariable Long contractId,
											   @Valid @RequestBody ContractBillRateCreateReq request) {
		return BaseRes.ok("Khai bao don gia rieng theo hop dong thanh cong",
				contractBillRateService.create(contractId, request));
	}

	@GetMapping
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<List<ContractBillRateRes>> listByContract(@PathVariable Long contractId) {
		return BaseRes.ok(contractBillRateService.listByContract(contractId));
	}

	@GetMapping("/resolve")
	@PreAuthorize("hasRole('VT-05') or hasRole('VT-07')")
	public BaseRes<ResolvedContractBillRateRes> resolve(
			@PathVariable Long contractId,
			@RequestParam String professionalRole,
			@RequestParam String level,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
		return BaseRes.ok(contractBillRateService.resolve(contractId, professionalRole, level, asOf));
	}
}

