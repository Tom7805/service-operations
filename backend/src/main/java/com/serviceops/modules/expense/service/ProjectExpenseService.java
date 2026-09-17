package com.serviceops.modules.expense.service;

import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;

import java.util.List;

public interface ProjectExpenseService {
	ExpenseRes create(Long projectId, ExpenseCreateReq request);

	ExpenseRes updateRejected(Long expenseId, ExpenseCreateReq request);

	List<ExpenseRes> findPending();

	ExpenseRes approve(Long expenseId);

	ExpenseRes reject(Long expenseId, ExpenseRejectReq request);
}
