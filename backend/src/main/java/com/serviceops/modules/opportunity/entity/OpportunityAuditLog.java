package com.serviceops.modules.opportunity.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.opportunity.enums.OpportunityAuditAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Nhat ky co hoi ban hang (NCL-03-CN-001, TC-04): nguoi thuc hien, noi dung va thoi diem.
 */
@Getter
@Setter
@Entity
@Table(name = "opportunity_audit_logs")
public class OpportunityAuditLog extends BaseEntity {

	@Column(name = "opportunity_id")
	private Long opportunityId;

	@Enumerated(EnumType.STRING)
	@Column(name = "action_type", nullable = false, columnDefinition = "VARCHAR(30)")
	private OpportunityAuditAction actionType;

	@Column(name = "detail", length = 1000)
	private String detail;

	@Column(name = "actor_id", nullable = false)
	private Long actorId;

	@Column(name = "actor_username", length = 100)
	private String actorUsername;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}