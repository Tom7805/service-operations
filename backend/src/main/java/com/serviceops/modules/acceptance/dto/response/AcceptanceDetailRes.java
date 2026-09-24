package com.serviceops.modules.acceptance.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceDecisionType;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.enums.ConfirmationChannel;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Chi tiet phieu nghiem thu (NCL-12-CN-001/002/003): noi dung da chup (cong viec, san pham ban giao),
 * thong tin xac nhan cua khach hang, moc thanh toan da gan va lich su xac nhan/tu choi.
 */
public record AcceptanceDetailRes(
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
		String note,
		AcceptanceStatus status,
		Integer revisionNo,
		String lastRejectionReason,
		String signerName,
		LocalDate signedDate,
		String minutesUrl,
		ConfirmationChannel confirmationChannel,
		String confirmedBy,
		LocalDateTime confirmedAt,
		LinkedMilestoneRes paymentMilestone,
		String linkedBy,
		LocalDateTime linkedAt,
		List<TaskItemRes> tasks,
		List<DeliverableItemRes> deliverables,
		List<DecisionRes> decisions,
		String createdBy,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {

	/** Cong viec thuoc hang muc tai thoi diem lap/nop lai phieu. */
	public record TaskItemRes(Long taskId, String taskName) {
	}

	/** Phien ban san pham ban giao duoc dua vao phieu. */
	public record DeliverableItemRes(Long deliverableId, Long deliverableVersionId, String deliverableName,
			String versionNo) {
	}

	/** Moc thanh toan da gan kem trang thai hien tai (QTN-25). */
	public record LinkedMilestoneRes(Long id, String name, BigDecimal amount, LocalDate expectedDate,
			ContractMilestoneStatus status) {
	}

	/** Mot lan khach hang xac nhan hoac tu choi phieu. */
	public record DecisionRes(Long id, AcceptanceDecisionType decision, ConfirmationChannel channel,
			Integer revisionNo, String signerName, LocalDate signedDate, String minutesUrl, String reason,
			String recordedBy, LocalDateTime recordedAt) {
	}
}
