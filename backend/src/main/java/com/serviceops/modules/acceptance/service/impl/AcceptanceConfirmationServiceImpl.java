package com.serviceops.modules.acceptance.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.dto.request.AcceptanceConfirmReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceRejectReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.entity.AcceptanceDecision;
import com.serviceops.modules.acceptance.enums.AcceptanceDecisionType;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.enums.ConfirmationChannel;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.acceptance.repository.AcceptanceDecisionRepository;
import com.serviceops.modules.acceptance.security.AcceptanceAccessGuard;
import com.serviceops.modules.acceptance.service.AcceptanceConfirmationService;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.project.entity.Project;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * NCL-12-CN-002: ghi nhan quyet dinh cua khach hang voi phieu nghiem thu.
 *
 * <ul>
 *   <li>TC-01: phieu PENDING_CONFIRMATION -&gt; ACCEPTED, noi dung bi khoa; moc thanh toan da gan
 *       (neu dang PENDING) duoc mo sang READY_TO_INVOICE (QTN-25).</li>
 *   <li>TC-02: tu choi -&gt; NEEDS_REVISION, luu ly do; Quan ly du an sua va nop lai phieu.</li>
 *   <li>Moi quyet dinh them mot dong {@link AcceptanceDecision} (khong ghi de) va ghi Nhat ky he thong (TC-04).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AcceptanceConfirmationServiceImpl implements AcceptanceConfirmationService {

	private final AcceptanceCertificateRepository certificateRepository;
	private final AcceptanceDecisionRepository decisionRepository;
	private final ContractMilestoneRepository contractMilestoneRepository;
	private final ContractMilestoneService contractMilestoneService;
	private final AcceptanceAccessGuard accessGuard;
	private final AcceptanceViewAssembler assembler;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public AcceptanceDetailRes confirm(Long certificateId, AcceptanceConfirmReq request) {
		AcceptanceCertificate certificate = requireLocked(certificateId);
		Project project = accessGuard.requireManagedProject(certificate.getProjectId());
		requireStatusPending(certificate);
		LocalDate today = LocalDate.now(clock);
		if (request.signedDate().isAfter(today)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngay ky bien ban khong duoc o tuong lai");
		}
		if (request.signedDate().isBefore(certificate.getCreatedAt().toLocalDate())) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay ky bien ban khong duoc truoc ngay lap phieu (" + certificate.getCreatedAt().toLocalDate() + ")");
		}

		LocalDateTime now = LocalDateTime.now(clock);
		String username = currentUsername();
		certificate.setStatus(AcceptanceStatus.ACCEPTED);
		certificate.setSignerName(request.signerName().trim());
		certificate.setSignedDate(request.signedDate());
		certificate.setMinutesUrl(request.minutesUrl().trim());
		certificate.setConfirmationChannel(ConfirmationChannel.INTERNAL);
		certificate.setConfirmedBy(username);
		certificate.setConfirmedAt(now);
		certificate.setUpdatedAt(now);
		certificate = certificateRepository.saveAndFlush(certificate);

		saveDecision(certificate, AcceptanceDecisionType.ACCEPTED, certificate.getSignerName(),
				certificate.getSignedDate(), certificate.getMinutesUrl(), null, username, now);

		String milestoneNote = openLinkedMilestone(certificate);
		auditLogService.record("Xác nhận phiếu nghiệm thu", AuditTargetType.ACCEPTANCE, certificate.getId(),
				"Phiếu nghiệm thu " + certificate.getCertificateCode(),
				"Khach hang (" + certificate.getSignerName() + ") xac nhan phieu " + certificate.getCertificateCode()
						+ " lan " + certificate.getRevisionNo() + ", ky ngay " + certificate.getSignedDate()
						+ ", bien ban " + certificate.getMinutesUrl() + milestoneNote);
		return assembler.toDetail(certificate, project);
	}

	@Override
	public AcceptanceDetailRes reject(Long certificateId, AcceptanceRejectReq request) {
		AcceptanceCertificate certificate = requireLocked(certificateId);
		Project project = accessGuard.requireManagedProject(certificate.getProjectId());
		requireStatusPending(certificate);

		LocalDateTime now = LocalDateTime.now(clock);
		String username = currentUsername();
		String reason = request.reason().trim();
		certificate.setStatus(AcceptanceStatus.NEEDS_REVISION);
		certificate.setLastRejectionReason(reason);
		certificate.setUpdatedAt(now);
		certificate = certificateRepository.save(certificate);

		saveDecision(certificate, AcceptanceDecisionType.REJECTED, blankToNull(request.signerName()), null,
				blankToNull(request.minutesUrl()), reason, username, now);

		auditLogService.record("Từ chối phiếu nghiệm thu", AuditTargetType.ACCEPTANCE, certificate.getId(),
				"Phiếu nghiệm thu " + certificate.getCertificateCode(),
				"Khach hang tu choi phieu " + certificate.getCertificateCode() + " lan " + certificate.getRevisionNo()
						+ ", ly do: " + reason);
		return assembler.toDetail(certificate, project);
	}

	/** QTN-25: phieu vua ACCEPTED thi mo moc thanh toan da gan neu moc con cho nghiem thu. */
	private String openLinkedMilestone(AcceptanceCertificate certificate) {
		if (certificate.getContractMilestoneId() == null) {
			return "; chua gan moc thanh toan";
		}
		ContractMilestone milestone = contractMilestoneRepository.findById(certificate.getContractMilestoneId())
				.orElse(null);
		if (milestone == null || milestone.getStatus() != ContractMilestoneStatus.PENDING) {
			return "";
		}
		contractMilestoneService.updateStatus(milestone.getContractId(), milestone.getId(),
				ContractMilestoneStatus.READY_TO_INVOICE);
		return "; mo moc thanh toan \"" + milestone.getName() + "\" sang READY_TO_INVOICE";
	}

	private void saveDecision(AcceptanceCertificate certificate, AcceptanceDecisionType type, String signerName,
			LocalDate signedDate, String minutesUrl, String reason, String username, LocalDateTime now) {
		AcceptanceDecision decision = new AcceptanceDecision();
		decision.setCertificateId(certificate.getId());
		decision.setDecision(type);
		decision.setChannel(ConfirmationChannel.INTERNAL);
		decision.setRevisionNo(certificate.getRevisionNo());
		decision.setSignerName(signerName);
		decision.setSignedDate(signedDate);
		decision.setMinutesUrl(minutesUrl);
		decision.setReason(reason);
		decision.setRecordedBy(username);
		decision.setRecordedAt(now);
		decisionRepository.save(decision);
	}

	private AcceptanceCertificate requireLocked(Long certificateId) {
		return certificateRepository.findByIdForUpdate(certificateId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay phieu nghiem thu voi id=" + certificateId));
	}

	private void requireStatusPending(AcceptanceCertificate certificate) {
		switch (certificate.getStatus()) {
			case PENDING_CONFIRMATION -> {
			}
			case ACCEPTED -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Phieu " + certificate.getCertificateCode() + " da duoc khach hang xac nhan truoc do");
			case NEEDS_REVISION -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Phieu " + certificate.getCertificateCode()
							+ " dang cho chinh sua sau khi bi tu choi, hay nop lai truoc khi ghi nhan xac nhan");
		}
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
