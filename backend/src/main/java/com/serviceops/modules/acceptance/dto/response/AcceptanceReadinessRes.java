package com.serviceops.modules.acceptance.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.project.enums.TaskStatus;

import java.util.List;

/**
 * NCL-12-CN-001: kiem tra truoc hang muc da du dieu kien lap phieu nghiem thu chua (QTN-24). Man hinh
 * dung de liet ke cac cong viec con dang do (TC-02) va xem truoc san pham ban giao se vao phieu.
 */
public record AcceptanceReadinessRes(
		Long projectId,
		Long workPackageId,
		String workPackageName,
		boolean ready,
		int totalTasks,
		int doneTasks,
		List<UnfinishedTaskRes> unfinishedTasks,
		List<DeliverablePreviewRes> deliverables,
		Long activeCertificateId,
		String activeCertificateCode,
		AcceptanceStatus activeCertificateStatus) {

	public record UnfinishedTaskRes(Long taskId, String taskName, TaskStatus status) {
	}

	/** {@code latestVersionId} NULL = san pham chua ban giao lan nao, se khong vao phieu. */
	public record DeliverablePreviewRes(Long deliverableId, String deliverableName, Long latestVersionId,
			String latestVersionNo) {
	}
}
