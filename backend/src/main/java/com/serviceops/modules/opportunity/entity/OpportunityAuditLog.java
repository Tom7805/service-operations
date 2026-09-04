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
 * Nhat ky co hoi (NCL-03-CN-006, TC-04): ghi lai nguoi thuc hien, noi dung va
 * thoi diem cua cac thao tac nghiep vu tren mot co hoi. Dung chung cho toan
 * bo cac story cua Epic NCL-03 tren cung bang nay, giong quy uoc
 * {@code customer_audit_logs} cua module khach hang.
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

	/** Nguoi thuc hien. NULL khi khong xac dinh duoc CustomUserDetails (yeu cau chua xac thuc). */
	@Column(name = "actor_id")
	private Long actorUserId;

	@Column(name = "actor_username", length = 100)
	private String actorUsername;

	@Column(name = "created_at", insertable = false, updatable = false)
	private LocalDateTime createdAt;
}
