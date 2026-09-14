package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.ProjectClosureService;
import com.serviceops.modules.project.validator.ProjectClosureValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectClosureServiceImpl implements ProjectClosureService {

	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final ProjectClosureValidator validator;
	private final ProjectAuditLogger auditLogger;

	@Override
	public ProjectRes closeProject(Long projectId) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi id=" + projectId));

		List<Task> pendingTasks = taskRepository.findByProjectIdAndStatusOrderByIdAsc(projectId,
				TaskStatus.WAITING_APPROVAL);
		validator.validate(project, pendingTasks);

		project.setStatus(ProjectStatus.CLOSED);
		project = projectRepository.save(project);

		auditLogger.recordClose(project.getId(), project.getProjectCode());
		return toResponse(project);
	}

	private ProjectRes toResponse(Project project) {
		return new ProjectRes(project.getId(), project.getProjectCode(), project.getName(), project.getContractId(),
				project.getCustomerId(), project.getProjectType(), project.getLimitValue(), project.getStartDate(),
				project.getExpectedEndDate(), project.getProjectManagerId(), project.getStatus().name(),
				project.getCreatedBy(), project.getCreatedAt());
	}
}
