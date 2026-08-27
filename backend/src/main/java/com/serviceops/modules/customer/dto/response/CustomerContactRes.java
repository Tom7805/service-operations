package com.serviceops.modules.customer.dto.response;

import java.time.LocalDateTime;

public record CustomerContactRes(
	Long id,
	Long customerId,
	String fullName,
	String title,
	String email,
	String phone,
	boolean isPrimary,
	LocalDateTime createdAt
) {}
