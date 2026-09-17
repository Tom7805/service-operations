package com.serviceops.modules.expense.dto.response;

import com.serviceops.modules.expense.enums.ExpenseStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** NCL-08-CN-004: du lieu tra ve cho phieu chi phi thue ngoai. */
public record SubcontractorExpenseRes(Long id, Long projectId, Long userId, String contractorName,
		String workScope, BigDecimal amount, LocalDate incurredPeriod, ExpenseStatus status,
		LocalDateTime createdAt, String approvedBy, LocalDateTime approvedAt, String rejectedBy,
		LocalDateTime rejectedAt, String rejectReason) {

	public SubcontractorExpenseRes(Long id, Long projectId, Long userId, String contractorName,
			String workScope, BigDecimal amount, LocalDate incurredPeriod, ExpenseStatus status,
			LocalDateTime createdAt) {
		this(id, projectId, userId, contractorName, workScope, amount, incurredPeriod, status, createdAt,
				null, null, null, null, null);
	}
}
