package com.serviceops.modules.expense.service;

import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;

public interface ProjectExpenseService {
	ExpenseRes create(Long projectId, ExpenseCreateReq request);
}
