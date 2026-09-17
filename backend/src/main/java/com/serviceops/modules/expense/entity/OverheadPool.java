package com.serviceops.modules.expense.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.expense.enums.AllocationMethod;
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

/**
 * NCL-08-CN-005: mot lan phan bo chi phi chung cho toan bo du an cua mot ky (thang).
 *
 * <p>Moi ky chi phan bo mot lan (khong cho chay lai de tranh cong don chi phi vao bien
 * loi nhuan hai lan) — xem {@code OverheadAllocationServiceImpl#run}.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "overhead_pools")
public class OverheadPool extends BaseEntity {

	@Column(name = "period_start", nullable = false, unique = true)
	private LocalDate periodStart;

	@Column(name = "period_end", nullable = false)
	private LocalDate periodEnd;

	@Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal totalAmount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private AllocationMethod method = AllocationMethod.APPROVED_HOURS;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
