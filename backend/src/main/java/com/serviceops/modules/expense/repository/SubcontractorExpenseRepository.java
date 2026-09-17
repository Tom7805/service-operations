package com.serviceops.modules.expense.repository;

import com.serviceops.modules.expense.entity.SubcontractorExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubcontractorExpenseRepository extends JpaRepository<SubcontractorExpense, Long> {

	List<SubcontractorExpense> findByStatusOrderByIncurredPeriodAscIdAsc(ExpenseStatus status);

	List<SubcontractorExpense> findByProjectIdOrderByIncurredPeriodDescIdDesc(Long projectId);
}
