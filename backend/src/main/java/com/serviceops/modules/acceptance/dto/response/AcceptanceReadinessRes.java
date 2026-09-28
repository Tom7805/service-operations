package com.serviceops.modules.acceptance.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.project.enums.TaskStatus;

import java.math.BigDecimal;
import java.util.List;

/**
 * NCL-12-CN-001: kiem tra truoc hang muc da du dieu kien lap phieu nghiem thu chua (QTN-24). Man hinh
 * dung de liet ke cac cong viec con dang do (TC-02) va xem truoc san pham ban giao se vao phieu.
 *
 * <p>{@code valueSuggestion}: gia tri nghiem thu he thong tu tinh tu cong viec cua nhanh hang muc — chi co
 * khi hang muc du dieu kien va loai hop dong tinh duoc (xem {@code AcceptanceValueEstimator}); NULL thi nguoi
 * lap tu nhap.</p>
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
		AcceptanceStatus activeCertificateStatus,
		ValueSuggestionRes valueSuggestion) {

	public record UnfinishedTaskRes(Long taskId, String taskName, TaskStatus status) {
	}

	/** {@code latestVersionId} NULL = san pham chua ban giao lan nao, se khong vao phieu. */
	public record DeliverablePreviewRes(Long deliverableId, String deliverableName, Long latestVersionId,
			String latestVersionNo) {
	}

	/**
	 * {@code method} HOURLY: tong doanh thu gio cong da duyet, tinh phi cua cong viec trong nhanh.
	 * PERCENTAGE_OF_COMPLETION: gia tri hop dong chia deu cho {@code projectTaskCount} cong viec cua du an.
	 * {@code missingRateEntryCount}: so dong gio cong chua tra duoc don gia, chua tinh vao goi y.
	 */
	public record ValueSuggestionRes(RecognitionMethod method, BigDecimal suggestedValue, int projectTaskCount,
			int missingRateEntryCount, List<TaskValueRes> tasks) {
	}

	/** {@code billableHours} NULL voi PERCENTAGE_OF_COMPLETION (khong tinh theo gio). */
	public record TaskValueRes(Long taskId, String taskName, BigDecimal billableHours, BigDecimal value) {
	}
}
