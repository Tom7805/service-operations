package com.serviceops.modules.acceptance.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.acceptance.dto.request.DeliverableCreateReq;
import com.serviceops.modules.acceptance.dto.request.DeliverableVersionReq;
import com.serviceops.modules.acceptance.dto.response.DeliverableRes;
import com.serviceops.modules.acceptance.dto.response.DeliverableVersionRes;
import com.serviceops.modules.acceptance.entity.Deliverable;
import com.serviceops.modules.acceptance.entity.DeliverableVersion;
import com.serviceops.modules.acceptance.mapper.DeliverableMapper;
import com.serviceops.modules.acceptance.repository.DeliverableRepository;
import com.serviceops.modules.acceptance.repository.DeliverableVersionRepository;
import com.serviceops.modules.acceptance.security.AcceptanceAccessGuard;
import com.serviceops.modules.acceptance.service.DeliverableService;
import com.serviceops.modules.acceptance.validator.DeliverableVersionUniqueValidator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * NCL-12-CN-004: quan ly san pham ban giao va phien ban.
 *
 * <ul>
 *   <li>Chi Quan ly du an cua du an (QTN-01, TC-03); thay doi chi khi du an dang chay.</li>
 *   <li>San pham gan voi mot hang muc; ten khong trung trong cung hang muc.</li>
 *   <li>Moi lan ban giao tao phien ban moi, khong sua/xoa phien ban cu (TC-01); so phien ban khong
 *       trung trong mot san pham (TC-02).</li>
 *   <li>Moi thay doi ghi Nhat ky he thong (TC-04).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DeliverableServiceImpl implements DeliverableService {

	private final DeliverableRepository deliverableRepository;
	private final DeliverableVersionRepository versionRepository;
	private final WorkPackageRepository workPackageRepository;
	private final DeliverableVersionUniqueValidator versionUniqueValidator;
	private final AcceptanceAccessGuard accessGuard;
	private final DeliverableMapper mapper;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public DeliverableRes create(Long projectId, DeliverableCreateReq request) {
		Project project = accessGuard.requireManagedProject(projectId);
		requireRunning(project);
		WorkPackage workPackage = workPackageRepository.findById(request.workPackageId())
				.filter(pack -> projectId.equals(pack.getProjectId()))
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hang muc thuoc du an"));
		String name = request.name().trim();
		if (deliverableRepository.existsByWorkPackageIdAndNameIgnoreCase(workPackage.getId(), name)) {
			throw duplicateName(name, workPackage);
		}
		LocalDateTime now = LocalDateTime.now(clock);
		Deliverable deliverable = new Deliverable();
		deliverable.setProjectId(projectId);
		deliverable.setWorkPackageId(workPackage.getId());
		deliverable.setName(name);
		deliverable.setDeliverableType(request.deliverableType());
		deliverable.setDescription(blankToNull(request.description()));
		deliverable.setCreatedBy(currentUsername());
		deliverable.setCreatedAt(now);
		deliverable.setUpdatedAt(now);
		try {
			deliverable = deliverableRepository.saveAndFlush(deliverable);
		} catch (DataIntegrityViolationException ex) {
			throw duplicateName(name, workPackage);
		}
		auditLogService.record("Khai báo sản phẩm bàn giao", AuditTargetType.ACCEPTANCE, deliverable.getId(),
				"Sản phẩm bàn giao " + name,
				"Khai bao san pham \"" + name + "\" (" + deliverable.getDeliverableType() + ") cho hang muc \""
						+ workPackage.getName() + "\" du an " + project.getProjectCode());
		return mapper.toResponse(deliverable, workPackage.getName(), List.of());
	}

	@Override
	@Transactional(readOnly = true)
	public List<DeliverableRes> list(Long projectId, Long workPackageId) {
		accessGuard.requireManagedProject(projectId);
		List<Deliverable> deliverables = deliverableRepository.findByProjectIdOrderByWorkPackageIdAscIdAsc(projectId)
				.stream()
				.filter(deliverable -> workPackageId == null || workPackageId.equals(deliverable.getWorkPackageId()))
				.toList();
		if (deliverables.isEmpty()) {
			return List.of();
		}
		Map<Long, String> packageNames = workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(projectId)
				.stream().collect(Collectors.toMap(WorkPackage::getId, WorkPackage::getName));
		Map<Long, List<DeliverableVersion>> versionsByDeliverable = versionRepository
				.findByDeliverableIdInOrderByDeliveredDateDescIdDesc(deliverables.stream().map(Deliverable::getId).toList())
				.stream()
				.collect(Collectors.groupingBy(DeliverableVersion::getDeliverableId, Collectors.toCollection(ArrayList::new)));
		return deliverables.stream()
				.map(deliverable -> mapper.toResponse(deliverable, packageNames.get(deliverable.getWorkPackageId()),
						versionsByDeliverable.getOrDefault(deliverable.getId(), new ArrayList<>())))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public DeliverableRes get(Long deliverableId) {
		Deliverable deliverable = requireDeliverable(deliverableId);
		accessGuard.requireManagedProject(deliverable.getProjectId());
		return toResponse(deliverable);
	}

	@Override
	public DeliverableVersionRes addVersion(Long deliverableId, DeliverableVersionReq request) {
		Deliverable deliverable = requireDeliverable(deliverableId);
		Project project = accessGuard.requireManagedProject(deliverable.getProjectId());
		requireRunning(project);
		String versionNo = request.versionNo().trim();
		versionUniqueValidator.validate(deliverableId, versionNo);
		if (request.deliveredDate().isAfter(LocalDate.now(clock))) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngay ban giao khong duoc o tuong lai");
		}
		DeliverableVersion version = new DeliverableVersion();
		version.setDeliverableId(deliverableId);
		version.setVersionNo(versionNo);
		version.setDeliveredDate(request.deliveredDate());
		version.setReceiverName(request.receiverName().trim());
		version.setFileUrl(blankToNull(request.fileUrl()));
		version.setNote(blankToNull(request.note()));
		version.setCreatedBy(currentUsername());
		version.setCreatedAt(LocalDateTime.now(clock));
		try {
			version = versionRepository.saveAndFlush(version);
		} catch (DataIntegrityViolationException ex) {
			throw versionUniqueValidator.duplicate(versionNo); // hai nguoi luu cung so phien ban cung luc
		}
		deliverable.setUpdatedAt(LocalDateTime.now(clock));
		deliverableRepository.save(deliverable);

		List<DeliverableVersion> versions = versionRepository.findByDeliverableIdOrderByDeliveredDateDescIdDesc(deliverableId);
		boolean latest = !versions.isEmpty() && versions.get(0).getId().equals(version.getId());
		auditLogService.record("Bàn giao phiên bản sản phẩm", AuditTargetType.ACCEPTANCE, deliverable.getId(),
				"Sản phẩm bàn giao " + deliverable.getName(),
				"Ban giao phien ban " + versionNo + " cua san pham \"" + deliverable.getName() + "\" ngay "
						+ version.getDeliveredDate() + " cho " + version.getReceiverName() + " (tong "
						+ versions.size() + " phien ban)");
		return mapper.toResponse(version, latest);
	}

	@Override
	@Transactional(readOnly = true)
	public List<DeliverableVersionRes> listVersions(Long deliverableId) {
		Deliverable deliverable = requireDeliverable(deliverableId);
		accessGuard.requireManagedProject(deliverable.getProjectId());
		return toResponse(deliverable).versions();
	}

	private DeliverableRes toResponse(Deliverable deliverable) {
		String workPackageName = workPackageRepository.findById(deliverable.getWorkPackageId())
				.map(WorkPackage::getName).orElse(null);
		return mapper.toResponse(deliverable, workPackageName,
				versionRepository.findByDeliverableIdOrderByDeliveredDateDescIdDesc(deliverable.getId()));
	}

	private Deliverable requireDeliverable(Long deliverableId) {
		return deliverableRepository.findById(deliverableId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay san pham ban giao voi id=" + deliverableId));
	}

	private void requireRunning(Project project) {
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Du an " + project.getProjectCode() + " da dong, khong the thay doi san pham ban giao");
		}
	}

	private BusinessRuleException duplicateName(String name, WorkPackage workPackage) {
		return new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
				"Hang muc \"" + workPackage.getName() + "\" da co san pham ban giao ten \"" + name + "\"");
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
