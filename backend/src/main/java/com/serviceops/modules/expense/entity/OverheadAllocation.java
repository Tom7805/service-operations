package com.serviceops.modules.expense.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** NCL-08-CN-005: phan chi phi chung ma mot du an nhan duoc trong mot lan phan bo (OverheadPool). */
@Getter
@Setter
@Entity
@Table(name = "overhead_allocations")
public class OverheadAllocation extends BaseEntity {

	@Column(name = "overhead_pool_id", nullable = false)
	private Long overheadPoolId;

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(name = "approved_hours", nullable = false, precision = 12, scale = 2)
	private BigDecimal approvedHours;

	@Column(name = "allocated_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal allocatedAmount;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
