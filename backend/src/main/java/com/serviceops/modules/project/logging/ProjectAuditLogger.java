package com.serviceops.modules.project.logging;

import com.serviceops.modules.project.entity.ProjectAuditLog;
import com.serviceops.modules.project.enums.ProjectAuditAction;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectAuditLogRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProjectAuditLogger {
	private final ProjectAuditLogRepository repository;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	public void recordCreate(Long projectId, Long contractId, String detail) {
		ProjectAuditLog audit = new ProjectAuditLog();
		audit.setProjectId(projectId);
		audit.setContractId(contractId);
		audit.setActionType(ProjectAuditAction.CREATE_FROM_CONTRACT);
		audit.setDetail(detail);
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setActorRole(currentRole());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
	}

	/** NCL-05-CN-007 / TC-04: ghi nhat ky khi tao du an tu mau (nguoi thuc hien, noi dung, thoi diem). */
	public void recordCreateFromTemplate(Long projectId, Long contractId, String templateCode, String detail) {
		ProjectAuditLog audit = new ProjectAuditLog();
		audit.setProjectId(projectId);
		audit.setContractId(contractId);
		audit.setActionType(ProjectAuditAction.CREATE_FROM_TEMPLATE);
		audit.setDetail(detail + " (mau: " + templateCode + ")");
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setActorRole(currentRole());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
	}

	/** NCL-05-CN-008 / TC-04: ghi nhat ky thay doi moc tien do (nguoi thuc hien, noi dung, thoi diem). */
	public void recordMilestoneChange(Long projectId, ProjectAuditAction action, String detail) {
		ProjectAuditLog audit = new ProjectAuditLog();
		audit.setProjectId(projectId);
		audit.setActionType(action);
		audit.setDetail(detail);
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setActorRole(currentRole());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
	}

	public void recordProgressUpdate(Long projectId, Long taskId, TaskStatus previousStatus, TaskStatus newStatus) {
		ProjectAuditLog audit = new ProjectAuditLog();
		audit.setProjectId(projectId);
		audit.setActionType(ProjectAuditAction.TASK_PROGRESS_UPDATED);
		audit.setDetail("Cong viec #" + taskId + ": " + previousStatus + " -> " + newStatus);
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setActorRole(currentRole());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
	}

	public void recordBudgetUpdate(Long projectId, Long taskId, BigDecimal previousBudget, BigDecimal newBudget) {
		ProjectAuditLog audit = new ProjectAuditLog();
		audit.setProjectId(projectId);
		audit.setActionType(ProjectAuditAction.TASK_BUDGET_UPDATED);
		audit.setDetail("Cong viec #" + taskId + ": ngan sach gio " + formatHours(previousBudget) + " -> "
				+ formatHours(newBudget));
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setActorRole(currentRole());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
	}

	public void recordClose(Long projectId, String projectCode) {
		ProjectAuditLog audit = new ProjectAuditLog();
		audit.setProjectId(projectId);
		audit.setActionType(ProjectAuditAction.PROJECT_CLOSED);
		audit.setDetail("Dong du an " + projectCode);
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setActorRole(currentRole());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
	}

	private String formatHours(BigDecimal hours) {
		return hours == null ? "chua dat" : hours.toPlainString();
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}

	private String currentRole() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null) {
			return null;
		}
		return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority)
				.filter(role -> role.startsWith("ROLE_")).map(role -> role.substring(5)).findFirst().orElse(null);
	}
}