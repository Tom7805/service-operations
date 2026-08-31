package com.serviceops.modules.opportunity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OpportunityCreateReq(
	@NotBlank(message = "Tên cơ hội không được để trống") String name,
	@NotNull(message = "Vui lòng chọn khách hàng") Long customerId,
	Long ownerUserId,
	BigDecimal amount,
	LocalDate expectedCloseDate,
	String note
) {
}
