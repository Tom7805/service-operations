package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.dto.request.ProjectRiskReq;
import com.serviceops.modules.project.dto.request.ProjectRiskStatusReq;
import com.serviceops.modules.project.dto.response.ProjectRiskRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectRisk;
import com.serviceops.modules.project.enums.ProjectAuditAction;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.ProjectRiskRepository;
import com.serviceops.modules.project.service.ProjectRiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * NCL-05-CN-009: quan ly rui ro cua du an.
 *
 * <p>Quy tac:</p>
 * <ul>
 *   <li>Chi thao tac tren du an dang chay ({@code RUNNING}); du an da dong -&gt; {@code 400 INVALID_STATE}.</li>
 *   <li>Nguoi theo doi phai la tai khoan dang hoat dong.</li>
 *   <li>TC-02: diem rui ro (1..9) va muc do (severity) tinh DONG khi doc tu
 *       impact x likelihood — khong luu DB, khong can job nen.</li>
 *   <li>TC-04: moi thao tac tao/cap nhat/xoa deu ghi nhat ky du an.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ProjectRiskServiceImpl implements ProjectRiskService {

	private final ProjectRepository projectRepository;
	private final ProjectRiskRepository riskRepository;
	private final UserRepository userRepository;
	private final ProjectAuditLogger auditLogger;
	private final Clock clock;

	@Override
	public ProjectRiskRes createRisk(Long projectId, ProjectRiskReq request) {
		Project project = requireOpenProject(projectId);
		ProjectRisk risk = new ProjectRisk();
		risk.setProjectId(project.getId());
		applyRequest(risk, request);
		risk.setStatus(com.serviceops.modules.project.enums.RiskStatus.OPEN);
		risk.setCreatedBy(currentUsername());
		LocalDateTime now = LocalDateTime.now(clock);
		risk.setCreatedAt(now);
		risk.setUpdatedAt(now);
		ProjectRisk saved = riskRepository.save(risk);
		auditLogger.recordRiskChange(project.getId(), ProjectAuditAction.RISK_CREATED,
				"Ghi nhan rui ro \"" + summary(saved.getDescription()) + "\" (tac dong " + saved.getImpact()
						+ ", kha nang " + saved.getLikelihood() + ")");
		return toResponse(saved);
	}

	@Override
	public ProjectRiskRes updateRisk(Long projectId, Long riskId, ProjectRiskReq request) {
		Project project = requireOpenProject(projectId);
		ProjectRisk risk = requireRisk(projectId, riskId);
		applyRequest(risk, request);
		risk.setUpdatedAt(LocalDateTime.now(clock));
		riskRepository.save(risk);
		auditLogger.recordRiskChange(project.getId(), ProjectAuditAction.RISK_UPDATED,
				"Cap nhat rui ro \"" + summary(risk.getDescription()) + "\"");
		return toResponse(risk);
	}

	@Override
	public ProjectRiskRes changeStatus(Long projectId, Long riskId, ProjectRiskStatusReq request) {
		Project project = requireOpenProject(projectId);
		ProjectRisk risk = requireRisk(projectId, riskId);
		risk.setStatus(request.status());
		risk.setUpdatedAt(LocalDateTime.now(clock));
		riskRepository.save(risk);
		auditLogger.recordRiskChange(project.getId(), ProjectAuditAction.RISK_UPDATED,
				"Chuyen trang thai rui ro \"" + summary(risk.getDescription()) + "\" sang " + request.status());
		return toResponse(risk);
	}

	@Override
	public void deleteRisk(Long projectId, Long riskId) {
		Project project = requireOpenProject(projectId);
		ProjectRisk risk = requireRisk(projectId, riskId);
		auditLogger.recordRiskChange(project.getId(), ProjectAuditAction.RISK_DELETED,
				"Xoa rui ro \"" + summary(risk.getDescription()) + "\"");
		riskRepository.delete(risk);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ProjectRiskRes> getRisks(Long projectId) {
		requireProject(projectId);
		return riskRepository.findByProjectIdOrderByIdAsc(projectId).stream()
				.sorted(Comparator.comparingInt(ProjectRisk::score).reversed()
						.thenComparing(ProjectRisk::getId))
				.map(this::toResponse).toList();
	}

	private void applyRequest(ProjectRisk risk, ProjectRiskReq request) {
		risk.setDescription(request.description().trim());
		risk.setImpact(request.impact());
		risk.setLikelihood(request.likelihood());
		risk.setMitigation(blankToNull(request.mitigation()));
		risk.setWatcherId(requireActiveUser(request.watcherId()).getId());
	}

	private ProjectRiskRes toResponse(ProjectRisk risk) {
		String watcherName = userRepository.findById(risk.getWatcherId())
				.map(User::getFullName).orElse(null);
		return new ProjectRiskRes(risk.getId(), risk.getProjectId(), risk.getDescription(),
				risk.getImpact(), risk.getLikelihood(), risk.score(), risk.severity(), risk.getStatus(),
				risk.getMitigation(), risk.getWatcherId(), watcherName, risk.getCreatedBy(),
				risk.getCreatedAt(), risk.getUpdatedAt());
	}

	private User requireActiveUser(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> notFound("Khong tim thay nguoi theo doi voi id=" + userId));
		if (user.getStatus() != UserStatus.ACTIVE) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Nguoi theo doi khong dang hoat dong");
		}
		return user;
	}

	private ProjectRisk requireRisk(Long projectId, Long riskId) {
		return riskRepository.findById(riskId)
				.filter(risk -> risk.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay rui ro thuoc du an"));
	}

	private Project requireOpenProject(Long projectId) {
		Project project = requireProject(projectId);
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the thay doi rui ro cua du an da dong");
		}
		return project;
	}

	private Project requireProject(Long projectId) {
		return projectRepository.findById(projectId)
				.orElseThrow(() -> notFound("Khong tim thay du an"));
	}

	private BusinessRuleException notFound(String message) {
		return new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, message);
	}

	private String summary(String description) {
		if (description == null) {
			return "";
		}
		String trimmed = description.trim();
		return trimmed.length() <= 80 ? trimmed : trimmed.substring(0, 77) + "...";
	}

	private String blankToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
