package com.serviceops.modules.expense.repository;

import com.serviceops.modules.expense.entity.ProjectExpense;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectExpenseRepository extends JpaRepository<ProjectExpense, Long> {
}
