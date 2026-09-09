package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.project.enums.ProjectAuditAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "project_audit_logs")
public class ProjectAuditLog extends BaseEntity {
	@Column(name = "project_id")
	private Long projectId;

	@Column(name = "contract_id")
	private Long contractId;

	@Enumerated(EnumType.STRING)
	@Column(name = "action_type", nullable = false, length = 40)
	private ProjectAuditAction actionType;

	@Column(length = 1000)
	private String detail;

	@Column(name = "actor_id")
	private Long actorId;

	@Column(name = "actor_username", length = 100)
	private String actorUsername;

	@Column(name = "actor_role", length = 20)
	private String actorRole;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}