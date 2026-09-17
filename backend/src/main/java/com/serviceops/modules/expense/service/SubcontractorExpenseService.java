package com.serviceops.modules.expense.service;

import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.request.SubcontractorExpenseReq;
import com.serviceops.modules.expense.dto.response.SubcontractorExpenseRes;

import java.util.List;

/** NCL-08-CN-004: ghi nhan chi phi thue ngoai cho du an. */
public interface SubcontractorExpenseService {

	SubcontractorExpenseRes create(Long projectId, SubcontractorExpenseReq request);

	List<SubcontractorExpenseRes> findPending();

	SubcontractorExpenseRes approve(Long expenseId);

	SubcontractorExpenseRes reject(Long expenseId, ExpenseRejectReq request);
}
