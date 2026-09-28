package com.serviceops.modules.expense.repository;

import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ProjectExpenseRepository extends JpaRepository<ProjectExpense, Long> {
	/** Phieu chi phi cua du an co ngay phat sinh trong khoang — nguon de gom chi phi tinh lai vao de nghi xuat hoa don (NCL-10-CN-001). */
	List<ProjectExpense> findByProjectIdAndExpenseDateBetweenOrderByExpenseDateAscIdAsc(
			Long projectId, LocalDate expenseDateFrom, LocalDate expenseDateTo);

	List<ProjectExpense> findByStatusOrderByExpenseDateAscIdAsc(ExpenseStatus status);

	List<ProjectExpense> findByProjectIdAndStatusOrderByExpenseDateAscIdAsc(Long projectId, ExpenseStatus status);

	List<ProjectExpense> findByProjectIdOrderByExpenseDateDescIdDesc(Long projectId);
}
