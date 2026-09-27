package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * NCL-13-CN-003: mot phieu nghiem thu trong danh sach tren cong.
 *
 * @param awaitingDecision true khi phieu dang cho khach hang xac nhan hoac tu choi
 */
public record PortalAcceptanceSummaryRes(
		Long id,
		String certificateCode,
		Long projectId,
		String projectCode,
		String projectName,
		String workPackageName,
		String title,
		BigDecimal acceptedValue,
		AcceptanceStatus status,
		Integer revisionNo,
		boolean awaitingDecision,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		LocalDateTime confirmedAt) {
}
