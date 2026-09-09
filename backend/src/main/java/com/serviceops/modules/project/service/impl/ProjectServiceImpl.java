package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.dto.request.ProjectCreateFromContractReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {
	private final ContractRepository contractRepository;
	private final UserRepository userRepository;
	private final ProjectRepository projectRepository;
	private final ProjectAuditLogger auditLogger;

	@Override
	@Transactional
	public ProjectRes createFromContract(Long contractId, ProjectCreateFromContractReq request) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));

		if (contract.getStatus() != ContractStatus.ACTIVE
				|| contract.getEndDate() != null && contract.getEndDate().isBefore(LocalDate.now())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi tao du an tu hop dong dang con hieu luc (ACTIVE)");
		}
		if (request.expectedEndDate().isBefore(request.startDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay ket thuc du kien khong duoc som hon ngay bat dau");
		}

		User manager = userRepository.findById(request.projectManagerId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay nguoi quan ly du an voi id=" + request.projectManagerId()));
		if (manager.getStatus() != UserStatus.ACTIVE) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Nguoi quan ly du an khong dang hoat dong");
		}

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
		project.setCreatedBy(currentUsername());
		project.setCreatedAt(LocalDateTime.now());
		project = projectRepository.save(project);

		auditLogger.recordCreate(project.getId(), contractId,
				"Tao du an " + project.getProjectCode() + " tu hop dong " + contract.getContractCode());
		return toResponse(project);
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

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}
}