package com.serviceops.modules.acceptance.dto.response;

import com.serviceops.modules.acceptance.enums.DeliverableType;

import java.time.LocalDateTime;
import java.util.List;

/** NCL-12-CN-004: san pham ban giao kem lich su phien ban (moi nhat truoc). */
public record DeliverableRes(
		Long id,
		Long projectId,
		Long workPackageId,
		String workPackageName,
		String name,
		DeliverableType deliverableType,
		String description,
		int versionCount,
		DeliverableVersionRes latestVersion,
		List<DeliverableVersionRes> versions,
		String createdBy,
		LocalDateTime createdAt) {
}
