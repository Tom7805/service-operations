package com.serviceops.modules.customer.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerOverviewItemRes(
	Long id,
	String code,
	String name,
	String status,
	BigDecimal amount,
	LocalDate date
) {}