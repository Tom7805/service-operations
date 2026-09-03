package com.serviceops.modules.quotation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record QuoteCreateReq(
		@NotEmpty(message = "Bao gia phai co it nhat mot vai tro")
		List<@Valid QuoteItemReq> items
) {}