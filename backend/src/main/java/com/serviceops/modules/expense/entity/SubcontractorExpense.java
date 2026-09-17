package com.serviceops.modules.expense.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.expense.enums.ExpenseStatus;
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

/** NCL-08-CN-004: ghi nhan chi phi thue ngoai (nha thau phu) cua du an. */
@Getter
@Setter
@Entity
@Table(name = "subcontractor_expenses")
public class SubcontractorExpense extends BaseEntity {

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "contractor_name", nullable = false, length = 200)
	private String contractorName;

	@Column(name = "work_scope", nullable = false, length = 1000)
	private String workScope;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;

	@Column(name = "incurred_period", nullable = false)
	private LocalDate incurredPeriod;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private ExpenseStatus status = ExpenseStatus.SUBMITTED;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@Column(name = "approved_by", length = 100)
	private String approvedBy;

	@Column(name = "approved_at")
	private LocalDateTime approvedAt;

	@Column(name = "rejected_by", length = 100)
	private String rejectedBy;

	@Column(name = "rejected_at")
	private LocalDateTime rejectedAt;

	@Column(name = "reject_reason", length = 1000)
	private String rejectReason;
}
