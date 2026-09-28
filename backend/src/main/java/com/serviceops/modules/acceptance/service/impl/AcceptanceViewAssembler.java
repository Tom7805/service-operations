package com.serviceops.modules.acceptance.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.dto.response.AcceptanceCertificateRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.mapper.AcceptanceMapper;
import com.serviceops.modules.acceptance.repository.AcceptanceDecisionRepository;
import com.serviceops.modules.acceptance.repository.AcceptanceItemRepository;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Dung du lieu tra ve cho phieu nghiem thu (tom tat va chi tiet). Khong kiem tra quyen — noi goi
 * chiu trach nhiem chan pham vi truoc (xem {@code AcceptanceAccessGuard}).
 */
@Component
@RequiredArgsConstructor
public class AcceptanceViewAssembler {

	private final AcceptanceItemRepository itemRepository;
	private final AcceptanceDecisionRepository decisionRepository;
	private final ProjectRepository projectRepository;
	private final WorkPackageRepository workPackageRepository;
	private final ContractMilestoneRepository contractMilestoneRepository;
	private final AcceptanceMapper mapper;

	public AcceptanceDetailRes toDetail(AcceptanceCertificate certificate) {
		Project project = projectRepository.findById(certificate.getProjectId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an cua phieu nghiem thu"));
		return toDetail(certificate, project);
	}

	public AcceptanceDetailRes toDetail(AcceptanceCertificate certificate, Project project) {
		String workPackageName = workPackageRepository.findById(certificate.getWorkPackageId())
				.map(WorkPackage::getName).orElse(null);
		ContractMilestone milestone = certificate.getContractMilestoneId() == null ? null
				: contractMilestoneRepository.findById(certificate.getContractMilestoneId()).orElse(null);
		return mapper.toDetail(certificate, project, workPackageName, milestone,
				itemRepository.findByCertificateIdOrderBySortOrderAscIdAsc(certificate.getId()),
				decisionRepository.findByCertificateIdOrderByRecordedAtAscIdAsc(certificate.getId()));
	}

	/** Nap du an, hang muc va moc thanh toan theo lo de tranh truy van tung dong. */
	public List<AcceptanceCertificateRes> toSummaries(List<AcceptanceCertificate> certificates) {
		if (certificates.isEmpty()) {
			return List.of();
		}
		Map<Long, Project> projects = projectRepository.findAllById(certificates.stream()
						.map(AcceptanceCertificate::getProjectId).distinct().toList()).stream()
				.collect(Collectors.toMap(Project::getId, Function.identity()));
		Map<Long, String> packageNames = workPackageRepository.findAllById(certificates.stream()
						.map(AcceptanceCertificate::getWorkPackageId).distinct().toList()).stream()
				.collect(Collectors.toMap(WorkPackage::getId, WorkPackage::getName));
		Map<Long, ContractMilestone> milestones = contractMilestoneRepository.findAllById(certificates.stream()
						.map(AcceptanceCertificate::getContractMilestoneId).filter(Objects::nonNull).distinct().toList())
				.stream().collect(Collectors.toMap(ContractMilestone::getId, Function.identity()));
		return certificates.stream()
				.map(certificate -> mapper.toSummary(certificate, projects.get(certificate.getProjectId()),
						packageNames.get(certificate.getWorkPackageId()),
						certificate.getContractMilestoneId() == null ? null
								: milestones.get(certificate.getContractMilestoneId())))
				.toList();
	}
}
