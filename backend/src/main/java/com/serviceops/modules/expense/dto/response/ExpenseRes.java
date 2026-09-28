package com.serviceops.modules.expense.dto.response;

import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.enums.ExpenseType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExpenseRes(Long id, Long projectId, Long userId, ExpenseType type, BigDecimal amount,
		LocalDate expenseDate, String description, String receiptUrl, Boolean billable,
		ExpenseStatus status, LocalDateTime createdAt, String approvedBy, LocalDateTime approvedAt,
		String rejectedBy, LocalDateTime rejectedAt, String rejectReason) {

	public ExpenseRes(Long id, Long projectId, Long userId, ExpenseType type, BigDecimal amount,
			LocalDate expenseDate, String description, String receiptUrl, Boolean billable,
			ExpenseStatus status, LocalDateTime createdAt) {
		this(id, projectId, userId, type, amount, expenseDate, description, receiptUrl, billable, status,
				createdAt, null, null, null, null, null);
	}
}
