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
	LocalDateTime createdAt,
	String companySize,
	String priority
) {
	public CustomerRes(Long id, String code, String name, String taxCode, String phone,
			String industry, String address, LocalDateTime createdAt) {
		this(id, code, name, taxCode, phone, industry, address, createdAt, null, null);
	}
}
