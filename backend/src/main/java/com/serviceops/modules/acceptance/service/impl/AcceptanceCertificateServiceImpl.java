package com.serviceops.modules.acceptance.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.dto.request.AcceptanceCreateReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceUpdateReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceCertificateRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.entity.AcceptanceItem;
import com.serviceops.modules.acceptance.entity.Deliverable;
import com.serviceops.modules.acceptance.entity.DeliverableVersion;
import com.serviceops.modules.acceptance.enums.AcceptanceItemType;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.acceptance.repository.AcceptanceItemRepository;
import com.serviceops.modules.acceptance.repository.DeliverableRepository;
import com.serviceops.modules.acceptance.repository.DeliverableVersionRepository;
import com.serviceops.modules.acceptance.security.AcceptanceAccessGuard;
import com.serviceops.modules.acceptance.service.AcceptanceCertificateService;
import com.serviceops.modules.acceptance.validator.WorkPackageCompletionValidator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * NCL-12-CN-001: lap phieu nghiem thu hang muc.
 *
 * <p>Quy tac:</p>
 * <ul>
 *   <li>Chi Quan ly du an cua du an (QTN-01) va du an dang chay.</li>
 *   <li>QTN-24: toan bo cong viec cua hang muc (ke ca hang muc con) phai DONE; nguoc lai chan va liet
 *       ke cong viec dang do (TC-02).</li>
 *   <li>Moi nhanh cay hang muc chi co mot phieu: hang muc, hang muc con chau hoac to tien da co phieu
 *       thi khong lap them — tranh nghiem thu hai lan cung mot cong viec. Phieu bi tu choi duoc sua
 *       va nop lai ({@link #resubmit}) thay vi lap moi.</li>
 *   <li>Noi dung phieu (cong viec, phien ban moi nhat cua tung san pham ban giao) duoc chup lai.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AcceptanceCertificateServiceImpl implements AcceptanceCertificateService {

	private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
	private static final String AUDIT_LABEL_PREFIX = "Phiếu nghiệm thu ";

	private final AcceptanceCertificateRepository certificateRepository;
	private final AcceptanceItemRepository itemRepository;
	private final ProjectRepository projectRepository;
	private final WorkPackageRepository workPackageRepository;
	private final TaskRepository taskRepository;
	private final DeliverableRepository deliverableRepository;
	private final DeliverableVersionRepository deliverableVersionRepository;
	private final WorkPackageCompletionValidator completionValidator;
	private final AcceptanceAccessGuard accessGuard;
	private final AcceptanceViewAssembler assembler;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public AcceptanceReadinessRes getReadiness(Long projectId, Long workPackageId) {
		Project project = accessGuard.requireManagedProject(projectId);
		WorkPackage workPackage = workPackageRepository.findById(workPackageId)
				.filter(pack -> projectId.equals(pack.getProjectId()))
				.orElseThrow(() -> notFound("Khong tim thay hang muc thuoc du an"));
		List<WorkPackage> packages = workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(projectId);
		Set<Long> scope = completionValidator.subtreeIds(workPackage.getId(), packages);
		List<Task> tasks = tasksIn(projectId, scope);
		List<Task> unfinished = completionValidator.unfinished(tasks);
		Optional<AcceptanceCertificate> existing = overlapping(workPackage, packages, scope).stream().findFirst();

		List<AcceptanceReadinessRes.DeliverablePreviewRes> deliverables = new ArrayList<>();
		latestVersions(scope).forEach((deliverable, version) -> deliverables.add(
				new AcceptanceReadinessRes.DeliverablePreviewRes(deliverable.getId(), deliverable.getName(),
						version == null ? null : version.getId(), version == null ? null : version.getVersionNo())));

		boolean ready = project.getStatus() == ProjectStatus.RUNNING && !tasks.isEmpty() && unfinished.isEmpty()
				&& existing.isEmpty();
		return new AcceptanceReadinessRes(projectId, workPackage.getId(), workPackage.getName(), ready,
				tasks.size(), tasks.size() - unfinished.size(),
				unfinished.stream().map(task -> new AcceptanceReadinessRes.UnfinishedTaskRes(task.getId(),
						task.getName(), task.getStatus())).toList(),
				deliverables,
				existing.map(AcceptanceCertificate::getId).orElse(null),
				existing.map(AcceptanceCertificate::getCertificateCode).orElse(null),
				existing.map(AcceptanceCertificate::getStatus).orElse(null));
	}

	@Override
	public AcceptanceDetailRes create(Long projectId, AcceptanceCreateReq request) {
		Project project = accessGuard.requireManagedProject(projectId);
		requireRunning(project);
		WorkPackage workPackage = workPackageRepository.findByIdForUpdate(request.workPackageId())
				.filter(pack -> projectId.equals(pack.getProjectId()))
				.orElseThrow(() -> notFound("Khong tim thay hang muc thuoc du an"));
		List<WorkPackage> packages = workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(projectId);
		Set<Long> scope = completionValidator.subtreeIds(workPackage.getId(), packages);
		List<Task> tasks = tasksIn(projectId, scope);
		completionValidator.validate(workPackage, tasks);
		List<AcceptanceCertificate> existing = overlapping(workPackage, packages, scope);
		if (!existing.isEmpty()) {
			AcceptanceCertificate found = existing.get(0);
			String hint = found.getStatus() == AcceptanceStatus.NEEDS_REVISION
					&& found.getWorkPackageId().equals(workPackage.getId())
					? " — hay chinh sua va nop lai phieu do" : "";
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Hang muc \"" + workPackage.getName() + "\" (hoac hang muc cha/con cua no) da co phieu nghiem thu "
							+ found.getCertificateCode() + " o trang thai " + found.getStatus() + hint);
		}

		LocalDateTime now = LocalDateTime.now(clock);
		AcceptanceCertificate certificate = new AcceptanceCertificate();
		certificate.setCertificateCode(generateCode(now.toLocalDate()));
		certificate.setProjectId(projectId);
		certificate.setWorkPackageId(workPackage.getId());
		applyContent(certificate, workPackage, request.title(), request.acceptedValue(), request.note());
		certificate.setStatus(AcceptanceStatus.PENDING_CONFIRMATION);
		certificate.setRevisionNo(1);
		certificate.setCreatedBy(currentUsername());
		certificate.setCreatedAt(now);
		certificate.setUpdatedAt(now);
		certificate = certificateRepository.save(certificate);
		int[] counts = saveItems(certificate.getId(), tasks, scope);

		auditLogService.record("Lập phiếu nghiệm thu hạng mục", AuditTargetType.ACCEPTANCE, certificate.getId(),
				AUDIT_LABEL_PREFIX + certificate.getCertificateCode(),
				"Lap phieu " + certificate.getCertificateCode() + " cho hang muc \"" + workPackage.getName()
						+ "\" du an " + project.getProjectCode() + ": " + counts[0] + " cong viec, " + counts[1]
						+ " san pham ban giao, gia tri " + certificate.getAcceptedValue().toPlainString());
		return assembler.toDetail(certificate, project);
	}

	@Override
	public AcceptanceDetailRes resubmit(Long certificateId, AcceptanceUpdateReq request) {
		AcceptanceCertificate certificate = certificateRepository.findByIdForUpdate(certificateId)
				.orElseThrow(() -> notFound("Khong tim thay phieu nghiem thu voi id=" + certificateId));
		Project project = accessGuard.requireManagedProject(certificate.getProjectId());
		requireRunning(project);
		switch (certificate.getStatus()) {
			case ACCEPTED -> throw invalidState("Phieu " + certificate.getCertificateCode()
					+ " da duoc khach hang xac nhan, noi dung da khoa");
			case PENDING_CONFIRMATION -> throw invalidState("Phieu " + certificate.getCertificateCode()
					+ " dang cho khach hang xac nhan, chi chinh sua duoc sau khi bi tu choi");
			case NEEDS_REVISION -> {
			}
		}
		WorkPackage workPackage = workPackageRepository.findById(certificate.getWorkPackageId())
				.orElseThrow(() -> notFound("Khong tim thay hang muc cua phieu nghiem thu"));
		List<WorkPackage> packages = workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(project.getId());
		Set<Long> scope = completionValidator.subtreeIds(workPackage.getId(), packages);
		List<Task> tasks = tasksIn(project.getId(), scope);
		completionValidator.validate(workPackage, tasks);

		applyContent(certificate, workPackage, request.title(), request.acceptedValue(), request.note());
		certificate.setStatus(AcceptanceStatus.PENDING_CONFIRMATION);
		certificate.setRevisionNo(certificate.getRevisionNo() + 1);
		certificate.setLastRejectionReason(null);
		certificate.setUpdatedAt(LocalDateTime.now(clock));
		certificate = certificateRepository.save(certificate);
		itemRepository.deleteByCertificateId(certificate.getId());
		int[] counts = saveItems(certificate.getId(), tasks, scope);

		auditLogService.record("Nộp lại phiếu nghiệm thu", AuditTargetType.ACCEPTANCE, certificate.getId(),
				AUDIT_LABEL_PREFIX + certificate.getCertificateCode(),
				"Nop lai phieu " + certificate.getCertificateCode() + " lan " + certificate.getRevisionNo() + ": "
						+ counts[0] + " cong viec, " + counts[1] + " san pham ban giao, gia tri "
						+ certificate.getAcceptedValue().toPlainString());
		return assembler.toDetail(certificate, project);
	}

	@Override
	@Transactional(readOnly = true)
	public List<AcceptanceCertificateRes> listByProject(Long projectId) {
		accessGuard.requireManagedProject(projectId);
		return assembler.toSummaries(certificateRepository.findByProjectIdOrderByIdDesc(projectId));
	}

	@Override
	@Transactional(readOnly = true)
	public List<AcceptanceCertificateRes> search(Long contractId, Long projectId, AcceptanceStatus status) {
		List<Project> projects;
		if (accessGuard.isAccountant()) {
			projects = contractId != null ? projectRepository.findByContractIdOrderByIdDesc(contractId)
					: projectRepository.findAll();
		} else {
			Long userId = accessGuard.currentUserId();
			projects = userId == null ? List.of() : projectRepository.findByProjectManagerId(userId);
		}
		List<Long> projectIds = projects.stream()
				.filter(project -> contractId == null || contractId.equals(project.getContractId()))
				.filter(project -> projectId == null || projectId.equals(project.getId()))
				.map(Project::getId)
				.toList();
		if (projectIds.isEmpty()) {
			return List.of();
		}
		List<AcceptanceCertificate> certificates = certificateRepository.findByProjectIdInOrderByIdDesc(projectIds)
				.stream()
				.filter(certificate -> status == null || certificate.getStatus() == status)
				.toList();
		return assembler.toSummaries(certificates);
	}

	@Override
	@Transactional(readOnly = true)
	public AcceptanceDetailRes getDetail(Long certificateId) {
		AcceptanceCertificate certificate = certificateRepository.findById(certificateId)
				.orElseThrow(() -> notFound("Khong tim thay phieu nghiem thu voi id=" + certificateId));
		Project project = projectRepository.findById(certificate.getProjectId())
				.orElseThrow(() -> notFound("Khong tim thay du an cua phieu nghiem thu"));
		accessGuard.requireReadable(project);
		return assembler.toDetail(certificate, project);
	}

	private void applyContent(AcceptanceCertificate certificate, WorkPackage workPackage, String title,
			BigDecimal acceptedValue, String note) {
		String trimmedTitle = blankToNull(title);
		certificate.setTitle(trimmedTitle != null ? trimmedTitle : "Nghiem thu hang muc " + workPackage.getName());
		certificate.setAcceptedValue(acceptedValue.setScale(2, RoundingMode.HALF_UP));
		certificate.setNote(blankToNull(note));
	}

	/** Chup lai cong viec va phien ban moi nhat cua tung san pham ban giao; tra ve [so cong viec, so san pham]. */
	private int[] saveItems(Long certificateId, List<Task> tasks, Set<Long> scope) {
		List<AcceptanceItem> items = new ArrayList<>();
		int order = 0;
		for (Task task : tasks) {
			AcceptanceItem item = new AcceptanceItem();
			item.setCertificateId(certificateId);
			item.setItemType(AcceptanceItemType.TASK);
			item.setTaskId(task.getId());
			item.setItemName(task.getName());
			item.setSortOrder(order++);
			items.add(item);
		}
		int deliverableCount = 0;
		for (Map.Entry<Deliverable, DeliverableVersion> entry : latestVersions(scope).entrySet()) {
			DeliverableVersion version = entry.getValue();
			if (version == null) {
				continue; // san pham chua ban giao lan nao thi chua co gi de nghiem thu
			}
			AcceptanceItem item = new AcceptanceItem();
			item.setCertificateId(certificateId);
			item.setItemType(AcceptanceItemType.DELIVERABLE);
			item.setDeliverableId(entry.getKey().getId());
			item.setDeliverableVersionId(version.getId());
			item.setItemName(entry.getKey().getName());
			item.setVersionNo(version.getVersionNo());
			item.setSortOrder(order++);
			items.add(item);
			deliverableCount++;
		}
		itemRepository.saveAll(items);
		return new int[] {tasks.size(), deliverableCount};
	}

	/** San pham ban giao cua cac hang muc trong pham vi, kem phien ban moi nhat (NULL neu chua ban giao). */
	private Map<Deliverable, DeliverableVersion> latestVersions(Set<Long> scope) {
		List<Deliverable> deliverables = deliverableRepository.findByWorkPackageIdInOrderByWorkPackageIdAscIdAsc(scope);
		Map<Deliverable, DeliverableVersion> result = new LinkedHashMap<>();
		if (deliverables.isEmpty()) {
			return result;
		}
		Map<Long, DeliverableVersion> newestByDeliverable = new LinkedHashMap<>();
		deliverableVersionRepository.findByDeliverableIdInOrderByDeliveredDateDescIdDesc(
						deliverables.stream().map(Deliverable::getId).toList())
				.forEach(version -> newestByDeliverable.putIfAbsent(version.getDeliverableId(), version));
		deliverables.forEach(deliverable -> result.put(deliverable, newestByDeliverable.get(deliverable.getId())));
		return result;
	}

	private List<Task> tasksIn(Long projectId, Set<Long> scope) {
		return taskRepository.findByProjectIdOrderByIdAsc(projectId).stream()
				.filter(task -> scope.contains(task.getWorkPackageId()))
				.toList();
	}

	/** Phieu da ton tai tren hang muc, hang muc con chau hoac hang muc to tien. */
	private List<AcceptanceCertificate> overlapping(WorkPackage workPackage, List<WorkPackage> packages,
			Set<Long> scope) {
		Set<Long> ids = new HashSet<>(scope);
		ids.addAll(completionValidator.ancestorIds(workPackage, packages));
		return certificateRepository.findByWorkPackageIdInAndStatusIn(ids, EnumSet.allOf(AcceptanceStatus.class));
	}

	private void requireRunning(Project project) {
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw invalidState("Du an " + project.getProjectCode() + " da dong, khong the lap hoac sua phieu nghiem thu");
		}
	}

	/** NT-yyyyMMdd-XXXXXX; cot certificate_code co UNIQUE nen trung ngau nhien (rat hiem) van bi chan o DB. */
	private String generateCode(LocalDate date) {
		String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
		return "NT-" + CODE_DATE.format(date) + "-" + suffix;
	}

	private BusinessRuleException notFound(String message) {
		return new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, message);
	}

	private BusinessRuleException invalidState(String message) {
		return new BusinessRuleException(ErrorCode.INVALID_STATE, message);
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
