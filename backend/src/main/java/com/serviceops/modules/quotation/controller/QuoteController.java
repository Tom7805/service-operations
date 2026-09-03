package com.serviceops.modules.quotation.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.quotation.dto.request.QuoteCreateReq;
import com.serviceops.modules.quotation.dto.response.QuoteRes;
import com.serviceops.modules.quotation.service.QuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/opportunities/{opportunityId}/quotes")
@RequiredArgsConstructor
public class QuoteController {

	private final QuoteService quoteService;

	@PostMapping
	@PreAuthorize("hasRole('VT-04')")
	public BaseRes<QuoteRes> create(@PathVariable Long opportunityId,
			@Valid @RequestBody QuoteCreateReq request) {
		return BaseRes.ok("Lap bao gia thanh cong", quoteService.create(opportunityId, request));
	}
}