package com.serviceops.modules.expense.repository;

import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectExpenseRepository extends JpaRepository<ProjectExpense, Long> {
	List<ProjectExpense> findByStatusOrderByExpenseDateAscIdAsc(ExpenseStatus status);

	List<ProjectExpense> findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(Long projectId, ExpenseStatus status);
}
