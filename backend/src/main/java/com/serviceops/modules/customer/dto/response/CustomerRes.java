package com.serviceops.modules.customer.dto.response;

import java.time.LocalDateTime;

public record CustomerRes(
	Long id,
	String code,
	String name,
	String taxCode,
	String phone,
	String industry,
	String address,
	LocalDateTime createdAt
) {}
