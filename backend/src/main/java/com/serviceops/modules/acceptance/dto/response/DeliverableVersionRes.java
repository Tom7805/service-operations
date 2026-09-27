package com.serviceops.modules.acceptance.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** NCL-12-CN-004: mot phien ban ban giao; {@code latest} danh dau phien ban moi nhat cua san pham. */
public record DeliverableVersionRes(
		Long id,
		Long deliverableId,
		String versionNo,
		LocalDate deliveredDate,
		String receiverName,
		String fileUrl,
		String note,
		boolean latest,
		String createdBy,
		LocalDateTime createdAt) {
}
