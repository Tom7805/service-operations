package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.dto.request.ProjectCreateFromTemplateReq;
import com.serviceops.modules.project.dto.request.ProjectTemplateReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.dto.response.ProjectTemplateRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectTemplate;
import com.serviceops.modules.project.entity.ProjectTemplateItem;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TemplateItemType;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.ProjectTemplateItemRepository;
import com.serviceops.modules.project.repository.ProjectTemplateRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import com.serviceops.modules.project.service.ProjectTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProjectTemplateServiceImpl implements ProjectTemplateService {

	private final ProjectTemplateRepository templateRepository;
	private final ProjectTemplateItemRepository templateItemRepository;
	private final ContractRepository contractRepository;
	private final UserRepository userRepository;
	private final ProjectRepository projectRepository;
	private final WorkPackageRepository workPackageRepository;
	private final TaskRepository taskRepository;
	private final ProjectAuditLogger auditLogger;

	@Override
	@Transactional(readOnly = true)
	public List<ProjectTemplateRes> findActiveTemplates() {
		return templateRepository.findByActiveTrueOrderByNameAsc().stream().map(this::toTemplateResponse).toList();
	}

	@Override
	@Transactional
	public ProjectTemplateRes createTemplate(ProjectTemplateReq request) {
		templateRepository.findByActiveTrueOrderByNameAsc().stream()
				.filter(template -> template.getCode().equalsIgnoreCase(request.code().trim()))
				.findFirst()
				.ifPresent(template -> {
					throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
							"Ma mau du an da ton tai: " + template.getCode());
				});

		ProjectTemplate template = new ProjectTemplate();
		template.setCode(request.code().trim());
		template.setName(request.name().trim());
		template.setDescription(blankToNull(request.description()));
		template.setProjectType(request.projectType().trim());
		template.setActive(Boolean.TRUE);
		template.setCreatedBy(currentUsername());
		template.setCreatedAt(LocalDateTime.now());
		return toTemplateResponse(templateRepository.save(template));
	}

	@Override
	@Transactional
	public ProjectRes createProjectFromTemplate(Long contractId, ProjectCreateFromTemplateReq request) {
		Contract contract = requireActiveContract(contractId);
		validateDates(request);
		User manager = requireActiveManager(request.projectManagerId());
		ProjectTemplate template = requireActiveTemplate(request.templateId());

		String username = currentUsername();
		LocalDateTime now = LocalDateTime.now();

		Project project = new Project();
		project.setProjectCode(generateProjectCode());
		project.setName(request.name().trim());
		project.setContractId(contractId);
		project.setCustomerId(contract.getCustomerId());
		project.setProjectType(contract.getContractType().name());
		project.setLimitValue(contract.getLimitValue());
		project.setStartDate(request.startDate());
		project.setExpectedEndDate(request.expectedEndDate());
		project.setProjectManagerId(manager.getId());
		project.setStatus(ProjectStatus.RUNNING);
		project.setCreatedBy(username);
		project.setCreatedAt(now);
		project = projectRepository.save(project);

		// TC-02: chi sao chep gia tri tu mau sang du an; mau goc khong tham chieu du an
		// nen bat ky thay doi nao tren cay cong viec cua du an cung khong anh huong mau.
		buildWorkBreakdownFromTemplate(project, template, username, now);

		auditLogger.recordCreateFromTemplate(project.getId(), contractId, template.getCode(),
				"Tao du an " + project.getProjectCode() + " tu hop dong " + contract.getContractCode());
		return toResponse(project);
	}

	private Contract requireActiveContract(Long contractId) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));
		if (contract.getStatus() != ContractStatus.ACTIVE
				|| contract.getEndDate() != null && contract.getEndDate().isBefore(LocalDate.now())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi tao du an tu hop dong dang con hieu luc (ACTIVE)");
		}
		return contract;
	}

	private void validateDates(ProjectCreateFromTemplateReq request) {
		if (request.expectedEndDate().isBefore(request.startDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay ket thuc du kien khong duoc som hon ngay bat dau");
		}
	}

	private User requireActiveManager(Long managerId) {
		User manager = userRepository.findById(managerId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay nguoi quan ly du an voi id=" + managerId));
		if (manager.getStatus() != UserStatus.ACTIVE) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Nguoi quan ly du an khong dang hoat dong");
		}
		return manager;
	}

	private ProjectTemplate requireActiveTemplate(Long templateId) {
		ProjectTemplate template = templateRepository.findById(templateId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay mau du an voi id=" + templateId));
		if (!Boolean.TRUE.equals(template.getActive())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Mau du an khong con hoat dong");
		}
		return template;
	}

	/**
	 * Dung lai cay hang muc, cong viec va ngan sach gio goi y theo mau. Cac item trong mau
	 * duoc sap xep theo id tang dan nen item cha luon duoc tao truoc con.
	 */
	private void buildWorkBreakdownFromTemplate(Project project, ProjectTemplate template,
			String username, LocalDateTime now) {
		List<ProjectTemplateItem> items = templateItemRepository.findByTemplateIdOrderByIdAsc(template.getId());
		Map<Long, Long> createdItemIds = new HashMap<>();
		// item id trong mau -> id hang muc chu cua item do trong du an moi
		// (hang muc chu cua cong viec con = hang muc chu cua cong viec cha).
		Map<Long, Long> owningPackageByItem = new HashMap<>();

		for (ProjectTemplateItem item : items) {
			Long newParentId = item.getParentId() == null ? null : createdItemIds.get(item.getParentId());
			if (item.getItemType() == TemplateItemType.WORK_PACKAGE) {
				WorkPackage workPackage = new WorkPackage();
				workPackage.setProjectId(project.getId());
				workPackage.setParentId(newParentId);
				workPackage.setName(item.getName());
				workPackage.setDescription(item.getDescription());
				workPackage.setSortOrder(item.getSortOrder());
				workPackage.setCreatedBy(username);
				workPackage.setCreatedAt(now);
				workPackage = workPackageRepository.save(workPackage);
				createdItemIds.put(item.getId(), workPackage.getId());
				owningPackageByItem.put(item.getId(), workPackage.getId());
			} else {
				Task task = new Task();
				task.setProjectId(project.getId());
				// Cong viec luon thuoc hang muc gan nhat ben tren nhanh cay cua no.
				task.setWorkPackageId(requireOwningPackage(owningPackageByItem, item));
				task.setParentTaskId(isTaskParent(item, items) ? newParentId : null);
				task.setName(item.getName());
				task.setDescription(item.getDescription());
				task.setExpectedStartDate(project.getStartDate());
				task.setExpectedEndDate(project.getExpectedEndDate());
				task.setCreatedBy(username);
				task.setCreatedAt(now);
				task = taskRepository.save(task);
				if (item.getSuggestedBudgetHours() != null) {
					task.setBudgetHours(item.getSuggestedBudgetHours());
					taskRepository.save(task);
				}
				createdItemIds.put(item.getId(), task.getId());
				owningPackageByItem.put(item.getId(), owningPackageByItem.get(item.getParentId()));
			}
		}
	}

	private Long requireOwningPackage(Map<Long, Long> owningPackageByItem, ProjectTemplateItem item) {
		Long packageId = owningPackageByItem.get(item.getParentId());
		if (packageId == null) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Cay mau khong hop le: cong viec khong co hang muc cha");
		}
		return packageId;
	}

	private boolean isTaskParent(ProjectTemplateItem item, List<ProjectTemplateItem> items) {
		return items.stream()
				.filter(candidate -> candidate.getId().equals(item.getParentId()))
				.findFirst()
				.map(candidate -> candidate.getItemType() == TemplateItemType.TASK)
				.orElse(false);
	}

	private ProjectTemplateRes toTemplateResponse(ProjectTemplate template) {
		return new ProjectTemplateRes(template.getId(), template.getCode(), template.getName(),
				template.getDescription(), template.getProjectType(), template.getActive(),
				template.getCreatedBy(), template.getCreatedAt());
	}

	private ProjectRes toResponse(Project project) {
		return new ProjectRes(project.getId(), project.getProjectCode(), project.getName(), project.getContractId(),
				project.getCustomerId(), project.getProjectType(), project.getLimitValue(), project.getStartDate(),
				project.getExpectedEndDate(), project.getProjectManagerId(), project.getStatus().name(),
				project.getCreatedBy(), project.getCreatedAt());
	}

	private String generateProjectCode() {
		return "DA-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase();
	}

	private String blankToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}
}
