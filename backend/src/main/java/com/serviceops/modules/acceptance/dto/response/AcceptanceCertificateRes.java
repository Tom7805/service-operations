package com.serviceops.modules.acceptance.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Dong tom tat phieu nghiem thu cho man hinh danh sach (NCL-12-CN-001/003). */
public record AcceptanceCertificateRes(
		Long id,
		String certificateCode,
		Long projectId,
		String projectCode,
		String projectName,
		Long contractId,
		Long workPackageId,
		String workPackageName,
		String title,
		BigDecimal acceptedValue,
		AcceptanceStatus status,
		Integer revisionNo,
		Long contractMilestoneId,
		String contractMilestoneName,
		String createdBy,
		LocalDateTime createdAt,
		LocalDateTime confirmedAt) {
}
