package com.serviceops.modules.acceptance.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.dto.request.AcceptanceMilestoneLinkReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.dto.response.MilestoneAcceptanceRes;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.acceptance.service.AcceptanceMilestoneLinkService;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-12-CN-003: gan phieu nghiem thu voi moc thanh toan (chi Ke toan).
 *
 * <p>Sau moi lan gan/go, trang thai moc duoc dong bo theo phieu (QTN-25):</p>
 * <ul>
 *   <li>Phieu ACCEPTED + moc PENDING -&gt; moc READY_TO_INVOICE (TC-01).</li>
 *   <li>Phieu chua xac nhan + moc READY_TO_INVOICE (da mo tay truoc do) -&gt; dua moc ve PENDING,
 *       nen lap hoa don cho moc bi chan (TC-02).</li>
 *   <li>Moc bi go khoi phieu ma dang READY_TO_INVOICE -&gt; ve PENDING vi mat can cu mo moc.</li>
 * </ul>
 * <p>Moc da INVOICED thi khong gan/go nua — hoa don da phat hanh dua tren lien ket do.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AcceptanceMilestoneLinkServiceImpl implements AcceptanceMilestoneLinkService {

	private final AcceptanceCertificateRepository certificateRepository;
	private final ContractRepository contractRepository;
	private final ContractMilestoneRepository contractMilestoneRepository;
	private final ContractMilestoneService contractMilestoneService;
	private final ProjectRepository projectRepository;
	private final WorkPackageRepository workPackageRepository;
	private final AcceptanceViewAssembler assembler;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public AcceptanceDetailRes link(Long certificateId, AcceptanceMilestoneLinkReq request) {
		AcceptanceCertificate certificate = requireCertificate(certificateId);
		Project project = requireProject(certificate.getProjectId());
		ContractMilestone milestone = contractMilestoneRepository.findById(request.contractMilestoneId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay moc thanh toan voi id=" + request.contractMilestoneId()));
		if (!milestone.getContractId().equals(project.getContractId())) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Moc thanh toan \"" + milestone.getName() + "\" khong thuoc hop dong cua du an " + project.getProjectCode());
		}
		if (milestone.getId().equals(certificate.getContractMilestoneId())) {
			return assembler.toDetail(certificate, project); // da gan dung moc nay — khong doi gi
		}
		if (milestone.getStatus() == ContractMilestoneStatus.INVOICED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Moc thanh toan \"" + milestone.getName() + "\" da xuat hoa don, khong the gan phieu nghiem thu");
		}
		certificateRepository.findByContractMilestoneId(milestone.getId()).ifPresent(other -> {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Moc thanh toan \"" + milestone.getName() + "\" da gan voi phieu nghiem thu " + other.getCertificateCode());
		});

		String previousNote = releasePreviousMilestone(certificate);
		certificate.setContractMilestoneId(milestone.getId());
		certificate.setLinkedBy(currentUsername());
		certificate.setLinkedAt(LocalDateTime.now(clock));
		certificate.setUpdatedAt(LocalDateTime.now(clock));
		try {
			certificate = certificateRepository.saveAndFlush(certificate);
		} catch (DataIntegrityViolationException ex) {
			// Hai Ke toan gan hai phieu vao cung mot moc cung luc — UNIQUE(contract_milestone_id) chan luot sau.
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Moc thanh toan \"" + milestone.getName() + "\" vua duoc gan voi phieu nghiem thu khac");
		}

		String syncNote = syncMilestone(certificate, milestone);
		auditLogService.record("Gắn phiếu nghiệm thu với mốc thanh toán", AuditTargetType.ACCEPTANCE,
				certificate.getId(), "Phiếu nghiệm thu " + certificate.getCertificateCode(),
				"Gan phieu " + certificate.getCertificateCode() + " (" + certificate.getStatus() + ") voi moc \""
						+ milestone.getName() + "\" gia tri " + milestone.getAmount().toPlainString()
						+ previousNote + syncNote);
		return assembler.toDetail(certificate, project);
	}

	@Override
	public AcceptanceDetailRes unlink(Long certificateId) {
		AcceptanceCertificate certificate = requireCertificate(certificateId);
		Project project = requireProject(certificate.getProjectId());
		if (certificate.getContractMilestoneId() == null) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Phieu " + certificate.getCertificateCode() + " chua gan moc thanh toan nao");
		}
		String note = releasePreviousMilestone(certificate);
		certificate.setContractMilestoneId(null);
		certificate.setLinkedBy(null);
		certificate.setLinkedAt(null);
		certificate.setUpdatedAt(LocalDateTime.now(clock));
		certificate = certificateRepository.save(certificate);
		auditLogService.record("Gỡ phiếu nghiệm thu khỏi mốc thanh toán", AuditTargetType.ACCEPTANCE,
				certificate.getId(), "Phiếu nghiệm thu " + certificate.getCertificateCode(),
				"Go phieu " + certificate.getCertificateCode() + " khoi moc thanh toan" + note);
		return assembler.toDetail(certificate, project);
	}

	@Override
	@Transactional(readOnly = true)
	public List<MilestoneAcceptanceRes> listForContract(Long contractId) {
		if (!contractRepository.existsById(contractId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay hop dong voi id=" + contractId);
		}
		List<ContractMilestone> milestones = contractMilestoneRepository.findByContractIdOrderByExpectedDateAscIdAsc(contractId);
		if (milestones.isEmpty()) {
			return List.of();
		}
		Map<Long, AcceptanceCertificate> byMilestone = certificateRepository
				.findByContractMilestoneIdIn(milestones.stream().map(ContractMilestone::getId).toList()).stream()
				.collect(Collectors.toMap(AcceptanceCertificate::getContractMilestoneId, Function.identity()));
		Map<Long, Project> projects = projectRepository.findAllById(byMilestone.values().stream()
						.map(AcceptanceCertificate::getProjectId).distinct().toList()).stream()
				.collect(Collectors.toMap(Project::getId, Function.identity()));
		Map<Long, String> packageNames = workPackageRepository.findAllById(byMilestone.values().stream()
						.map(AcceptanceCertificate::getWorkPackageId).distinct().toList()).stream()
				.collect(Collectors.toMap(WorkPackage::getId, WorkPackage::getName));
		return milestones.stream().map(milestone -> {
			AcceptanceCertificate certificate = byMilestone.get(milestone.getId());
			Project project = certificate == null ? null : projects.get(certificate.getProjectId());
			return new MilestoneAcceptanceRes(milestone.getId(), milestone.getContractId(), milestone.getName(),
					milestone.getAmount(), milestone.getExpectedDate(), milestone.getAcceptanceCondition(),
					milestone.getStatus(),
					certificate == null ? null : certificate.getId(),
					certificate == null ? null : certificate.getCertificateCode(),
					certificate == null ? null : certificate.getStatus(),
					project == null ? null : project.getProjectCode(),
					certificate == null ? null : packageNames.get(certificate.getWorkPackageId()));
		}).toList();
	}

	/** Go phieu khoi moc cu: moc cu da INVOICED thi chan; dang READY_TO_INVOICE thi ve PENDING. */
	private String releasePreviousMilestone(AcceptanceCertificate certificate) {
		if (certificate.getContractMilestoneId() == null) {
			return "";
		}
		ContractMilestone previous = contractMilestoneRepository.findById(certificate.getContractMilestoneId())
				.orElse(null);
		if (previous == null) {
			return "";
		}
		if (previous.getStatus() == ContractMilestoneStatus.INVOICED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Moc thanh toan \"" + previous.getName() + "\" da xuat hoa don dua tren phieu "
							+ certificate.getCertificateCode() + ", khong the go lien ket");
		}
		String note = "; bo lien ket voi moc \"" + previous.getName() + "\"";
		if (previous.getStatus() == ContractMilestoneStatus.READY_TO_INVOICE) {
			contractMilestoneService.holdForAcceptance(previous.getContractId(), previous.getId(),
					"go khoi phieu nghiem thu " + certificate.getCertificateCode());
			note += " (moc ve PENDING)";
		}
		return note;
	}

	private String syncMilestone(AcceptanceCertificate certificate, ContractMilestone milestone) {
		boolean accepted = certificate.getStatus() == AcceptanceStatus.ACCEPTED;
		if (accepted && milestone.getStatus() == ContractMilestoneStatus.PENDING) {
			contractMilestoneService.updateStatus(milestone.getContractId(), milestone.getId(),
					ContractMilestoneStatus.READY_TO_INVOICE);
			return "; moc chuyen sang READY_TO_INVOICE";
		}
		if (!accepted && milestone.getStatus() == ContractMilestoneStatus.READY_TO_INVOICE) {
			contractMilestoneService.holdForAcceptance(milestone.getContractId(), milestone.getId(),
					"phieu nghiem thu " + certificate.getCertificateCode() + " chua duoc khach hang xac nhan");
			return "; moc ve PENDING cho khach hang xac nhan";
		}
		return "";
	}

	private AcceptanceCertificate requireCertificate(Long certificateId) {
		return certificateRepository.findByIdForUpdate(certificateId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay phieu nghiem thu voi id=" + certificateId));
	}

	private Project requireProject(Long projectId) {
		return projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an cua phieu nghiem thu"));
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
