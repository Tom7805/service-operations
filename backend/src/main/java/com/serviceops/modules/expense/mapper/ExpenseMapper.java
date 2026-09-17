package com.serviceops.modules.expense.mapper;

import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.dto.response.SubcontractorExpenseRes;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.entity.SubcontractorExpense;
import org.springframework.stereotype.Component;

@Component
public class ExpenseMapper {

	public ExpenseRes toResponse(ProjectExpense expense) {
		return new ExpenseRes(expense.getId(), expense.getProjectId(), expense.getUserId(), expense.getType(),
				expense.getAmount(), expense.getExpenseDate(), expense.getDescription(), expense.getReceiptUrl(),
				expense.getBillable(), expense.getStatus(), expense.getCreatedAt(), expense.getApprovedBy(),
				expense.getApprovedAt(), expense.getRejectedBy(), expense.getRejectedAt(), expense.getRejectReason());
	}

	/** NCL-08-CN-004: chuyen phieu chi phi thue ngoai sang du lieu tra ve. */
	public SubcontractorExpenseRes toResponse(SubcontractorExpense expense) {
		return new SubcontractorExpenseRes(expense.getId(), expense.getProjectId(), expense.getUserId(),
				expense.getContractorName(), expense.getWorkScope(), expense.getAmount(),
				expense.getIncurredPeriod(), expense.getStatus(), expense.getCreatedAt(), expense.getApprovedBy(),
				expense.getApprovedAt(), expense.getRejectedBy(), expense.getRejectedAt(), expense.getRejectReason());
	}
}
