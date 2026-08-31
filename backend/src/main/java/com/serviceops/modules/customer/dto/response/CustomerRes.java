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
	String priority,
	String status,
	Long mergedIntoId
) {
	public CustomerRes(Long id, String code, String name, String taxCode, String phone,
			String industry, String address, LocalDateTime createdAt) {
		this(id, code, name, taxCode, phone, industry, address, createdAt, null, null, null, null);
	}

	public CustomerRes(Long id, String code, String name, String taxCode, String phone,
			String industry, String address, LocalDateTime createdAt, String companySize, String priority) {
		this(id, code, name, taxCode, phone, industry, address, createdAt, companySize, priority, null, null);
	}
}
