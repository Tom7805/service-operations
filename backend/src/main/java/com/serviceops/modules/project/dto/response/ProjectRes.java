package com.serviceops.modules.project.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectRes(
		Long id,
		String projectCode,
		String name,
		Long contractId,
		Long customerId,
		String projectType,
		BigDecimal limitValue,
		LocalDate startDate,
		LocalDate expectedEndDate,
		Long projectManagerId,
		String status,
		String createdBy,
		LocalDateTime createdAt,
		/** Ten khach hang — chi danh sach du an (GET /projects) nap, de man "Du an" hien ten thay cho ma. */
		String customerName,
		/** Ho ten quan ly du an — chi danh sach du an nap. */
		String projectManagerName
) {
	/** Chu ky cu (khong kem ten): cac luong tao/doc/dong du an khong can ten hien thi. */
	public ProjectRes(Long id, String projectCode, String name, Long contractId, Long customerId, String projectType,
			BigDecimal limitValue, LocalDate startDate, LocalDate expectedEndDate, Long projectManagerId, String status,
			String createdBy, LocalDateTime createdAt) {
		this(id, projectCode, name, contractId, customerId, projectType, limitValue, startDate, expectedEndDate,
				projectManagerId, status, createdBy, createdAt, null, null);
	}
}