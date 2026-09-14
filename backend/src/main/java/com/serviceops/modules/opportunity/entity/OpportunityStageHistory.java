package com.serviceops.modules.opportunity.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Lich su chuyen giai doan cua mot co hoi (NCL-03-CN-002, TC-05).
 * Moi lan chuyen giai doan duoc luu lai kem giai doan cu, giai doan moi,
 * nguoi thuc hien va thoi diem thuc hien.
 */
@Getter
@Setter
@Entity
@Table(name = "opportunity_stage_history")
public class OpportunityStageHistory extends BaseEntity {

	@Column(name = "opportunity_id", nullable = false)
	private Long opportunityId;

	@Enumerated(EnumType.STRING)
	@Column(name = "from_stage", columnDefinition = "VARCHAR(30)")
	private OpportunityStage fromStage;

	@Enumerated(EnumType.STRING)
	@Column(name = "to_stage", nullable = false, columnDefinition = "VARCHAR(30)")
	private OpportunityStage toStage;

	@Column(name = "changed_by")
	private Long changedBy;

	@Column(name = "changed_by_username", length = 100)
	private String changedByUsername;

	@Column(name = "changed_at", nullable = false)
	private LocalDateTime changedAt;
}
