package com.serviceops.modules.expense.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.enums.ExpenseType;
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
@Table(name = "project_expenses")
public class ProjectExpense extends BaseEntity {

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(name = "expense_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private ExpenseType type;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;

	@Column(name = "expense_date", nullable = false)
	private LocalDate expenseDate;

	@Column(nullable = false, length = 1000)
	private String description;

	@Column(name = "receipt_url", length = 500)
	private String receiptUrl;

	@Column(nullable = false)
	private Boolean billable = false;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private ExpenseStatus status = ExpenseStatus.SUBMITTED;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
