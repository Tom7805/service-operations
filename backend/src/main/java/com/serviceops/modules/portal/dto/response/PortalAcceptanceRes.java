package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceDecisionType;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.enums.ConfirmationChannel;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * NCL-13-CN-003: chi tiet phieu nghiem thu tren cong — noi dung khach hang can doc truoc khi xac nhan
 * (cong viec, phien ban san pham ban giao, gia tri) va lich su cac lan xac nhan/tu choi. Khong co moc thanh
 * toan noi bo, ten tai khoan nhan vien da thao tac hay duong dan bien ban noi bo.
 *
 * @param awaitingDecision true khi khach hang con xac nhan/tu choi duoc (phieu PENDING_CONFIRMATION)
 */
public record PortalAcceptanceRes(
		Long id,
		String certificateCode,
		Long projectId,
		String projectCode,
		String projectName,
		String workPackageName,
		String title,
		BigDecimal acceptedValue,
		String note,
		AcceptanceStatus status,
		Integer revisionNo,
		String lastRejectionReason,
		String signerName,
		LocalDate signedDate,
		ConfirmationChannel confirmationChannel,
		LocalDateTime confirmedAt,
		boolean awaitingDecision,
		List<String> tasks,
		List<DeliverableItemRes> deliverables,
		List<DecisionRes> decisions,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {

	public record DeliverableItemRes(String deliverableName, String versionNo) {
	}

	/** Mot lan xac nhan/tu choi — ca lan Quan ly du an ghi nhan (INTERNAL) lan khach hang bam tren cong (PORTAL). */
	public record DecisionRes(AcceptanceDecisionType decision, ConfirmationChannel channel, Integer revisionNo,
			String signerName, LocalDate signedDate, String reason, LocalDateTime recordedAt) {
	}
}
