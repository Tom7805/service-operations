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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "opportunities")
public class Opportunity extends BaseEntity {

	@Column(nullable = false, length = 255)
	private String name;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "owner_user_id")
	private Long ownerUserId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private OpportunityStage stage = OpportunityStage.NEW;

	@Column(precision = 15, scale = 2)
	private BigDecimal amount;

	@Column(name = "expected_close_date")
	private LocalDate expectedCloseDate;

	@Column(length = 1000)
	private String note;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;
}
