package com.serviceops.modules.portal.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.acceptance.repository.AcceptanceDecisionRepository;
import com.serviceops.modules.acceptance.repository.AcceptanceItemRepository;
import com.serviceops.modules.acceptance.service.AcceptanceConfirmationService;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.portal.dto.request.PortalAcceptanceDecisionReq;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceRes;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceSummaryRes;
import com.serviceops.modules.portal.mapper.PortalMapper;
import com.serviceops.modules.portal.security.PortalDataScopeGuard;
import com.serviceops.modules.portal.security.PortalDataScopeGuard.PortalScope;
import com.serviceops.modules.portal.service.PortalAcceptanceService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-13-CN-003: khach hang duyet phieu nghiem thu tren cong.
 *
 * <ul>
 *   <li>TC-01: xac nhan -&gt; phieu ACCEPTED kem thoi diem va nguoi xac nhan (kenh PORTAL); moc thanh toan
 *       da gan duoc mo sang READY_TO_INVOICE (QTN-25) — dung chung logic voi NCL-12-CN-002.</li>
 *   <li>TC-02: tu choi bat buoc co ly do (400 neu bo trong) -&gt; phieu NEEDS_REVISION.</li>
 *   <li>TC-03: chi tai khoan cong; phieu cua khach hang khac -&gt; 403 + nhat ky tu choi.</li>
 *   <li>TC-04: nhat ky nghiem thu (ACCEPTANCE) do {@code AcceptanceConfirmationService} ghi; ngoai ra bao
 *       Quan ly du an qua thong bao trong he thong de kip xu ly.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PortalAcceptanceServiceImpl implements PortalAcceptanceService {

	private static final String NOTIFICATION_REFERENCE_TYPE = "ACCEPTANCE_CERTIFICATE";

	private final PortalDataScopeGuard scopeGuard;
	private final AcceptanceCertificateRepository certificateRepository;
	private final AcceptanceItemRepository itemRepository;
	private final AcceptanceDecisionRepository decisionRepository;
	private final AcceptanceConfirmationService confirmationService;
	private final ProjectRepository projectRepository;
	private final WorkPackageRepository workPackageRepository;
	private final NotificationService notificationService;
	private final PortalMapper mapper;
	private final AuditLogService auditLogService;

	@Override
	@Transactional(readOnly = true)
	public List<PortalAcceptanceSummaryRes> list(Long projectId, AcceptanceStatus status) {
		PortalScope scope = scopeGuard.currentScope();
		List<Project> projects = projectId == null
				? projectRepository.findByCustomerIdInOrderByIdDesc(scope.customerIds())
				: List.of(scopeGuard.requireProject(scope, projectId));
		if (projects.isEmpty()) {
			return List.of();
		}
		Map<Long, Project> projectsById = projects.stream().collect(Collectors.toMap(Project::getId, Function.identity()));
		List<AcceptanceCertificate> certificates = certificateRepository
				.findByProjectIdInOrderByIdDesc(projectsById.keySet()).stream()
				.filter(certificate -> status == null || certificate.getStatus() == status)
				.toList();
		Map<Long, String> packageNames = workPackageRepository.findAllById(certificates.stream()
						.map(AcceptanceCertificate::getWorkPackageId).distinct().toList()).stream()
				.collect(Collectors.toMap(WorkPackage::getId, WorkPackage::getName));
		return certificates.stream()
				.map(certificate -> mapper.toPortalAcceptanceSummary(certificate,
						projectsById.get(certificate.getProjectId()), packageNames.get(certificate.getWorkPackageId())))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public PortalAcceptanceRes get(Long certificateId) {
		PortalScope scope = scopeGuard.currentScope();
		AcceptanceCertificate certificate = requireOwnCertificate(scope, certificateId);
		PortalAcceptanceRes result = toResponse(certificate);
		auditLogService.record("Khách hàng xem phiếu nghiệm thu", AuditTargetType.PORTAL, certificate.getId(),
				"Phiếu nghiệm thu " + certificate.getCertificateCode(),
				"Khach hang " + scope.username() + " xem phieu nghiem thu " + certificate.getCertificateCode()
						+ " tren cong");
		return result;
	}

	@Override
	public PortalAcceptanceRes confirm(Long certificateId) {
		PortalScope scope = scopeGuard.currentScope();
		AcceptanceCertificate certificate = requireOwnCertificate(scope, certificateId);
		confirmationService.confirmOnPortal(certificate.getId(), scope.fullName());
		AcceptanceCertificate updated = reload(certificate.getId());
		notifyProjectManager(updated, "Khach hang da xac nhan nghiem thu " + updated.getCertificateCode(),
				scope.fullName() + " da xac nhan phieu nghiem thu " + updated.getCertificateCode() + " (" + updated.getTitle()
						+ ") tren cong khach hang.");
		return toResponse(updated);
	}

	@Override
	public PortalAcceptanceRes reject(Long certificateId, PortalAcceptanceDecisionReq request) {
		PortalScope scope = scopeGuard.currentScope();
		AcceptanceCertificate certificate = requireOwnCertificate(scope, certificateId);
		confirmationService.rejectOnPortal(certificate.getId(), request.reason(), scope.fullName());
		AcceptanceCertificate updated = reload(certificate.getId());
		notifyProjectManager(updated, "Khach hang tu choi nghiem thu " + updated.getCertificateCode(),
				scope.fullName() + " da tu choi phieu nghiem thu " + updated.getCertificateCode() + " tren cong, ly do: "
						+ updated.getLastRejectionReason());
		return toResponse(updated);
	}

	/** Phieu thuoc du an cua chinh khach hang; khong ton tai hay cua khach hang khac deu la 403 (QTN-26). */
	private AcceptanceCertificate requireOwnCertificate(PortalScope scope, Long certificateId) {
		AcceptanceCertificate certificate = certificateRepository.findById(certificateId)
				.orElseThrow(() -> new AccessDeniedException("Phieu nghiem thu khong thuoc khach hang cua tai khoan cong"));
		scopeGuard.requireProject(scope, certificate.getProjectId());
		return certificate;
	}

	private AcceptanceCertificate reload(Long certificateId) {
		return certificateRepository.findById(certificateId)
				.orElseThrow(() -> new AccessDeniedException("Phieu nghiem thu khong con ton tai"));
	}

	private PortalAcceptanceRes toResponse(AcceptanceCertificate certificate) {
		Project project = projectRepository.findById(certificate.getProjectId())
				.orElseThrow(() -> new AccessDeniedException("Khong tim thay du an cua phieu nghiem thu"));
		String workPackageName = workPackageRepository.findById(certificate.getWorkPackageId())
				.map(WorkPackage::getName).orElse(null);
		return mapper.toPortalAcceptance(certificate, project, workPackageName,
				itemRepository.findByCertificateIdOrderBySortOrderAscIdAsc(certificate.getId()),
				decisionRepository.findByCertificateIdOrderByRecordedAtAscIdAsc(certificate.getId()));
	}

	/** Bao Quan ly du an (thong bao trong he thong, cung giao dich voi quyet dinh cua khach hang). */
	private void notifyProjectManager(AcceptanceCertificate certificate, String title, String content) {
		projectRepository.findById(certificate.getProjectId()).ifPresent(project ->
				notificationService.sendInAppNotification(project.getProjectManagerId(),
						NotificationType.ACCEPTANCE_DECIDED_ON_PORTAL, title, content, certificate.getId(),
						NOTIFICATION_REFERENCE_TYPE));
	}
}
