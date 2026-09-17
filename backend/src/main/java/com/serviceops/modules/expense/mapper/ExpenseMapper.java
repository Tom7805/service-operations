package com.serviceops.modules.expense.mapper;

import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.entity.ProjectExpense;
import org.springframework.stereotype.Component;

@Component
public class ExpenseMapper {

	public ExpenseRes toResponse(ProjectExpense expense) {
		return new ExpenseRes(expense.getId(), expense.getProjectId(), expense.getUserId(), expense.getType(),
				expense.getAmount(), expense.getExpenseDate(), expense.getDescription(), expense.getReceiptUrl(),
				expense.getBillable(), expense.getStatus(), expense.getCreatedAt());
	}
}
