package com.serviceops.modules.report.repository;

import com.serviceops.modules.identity.employee.entity.Employee;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public class DashboardQueryRepository {

	@PersistenceContext
	private EntityManager entityManager;

	/** Tổng giờ công ĐÃ DUYỆT và tính phí trong kỳ; dòng đảo/sửa mang dấu nên cộng thẳng. */
	public BigDecimal sumApprovedBillableHours(LocalDate from, LocalDate to) {
		return entityManager.createQuery("""
				SELECT COALESCE(SUM(e.hours), 0)
				FROM TimeEntry e
				WHERE e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.APPROVED
				AND e.billable = true
				AND e.workDate BETWEEN :from AND :to
				""", BigDecimal.class)
				.setParameter("from", from)
				.setParameter("to", to)
				.getSingleResult();
	}

	/** Nhân sự có thời gian làm việc (hireDate đến endDate, để trống là còn làm) giao với kỳ. */
	public List<Employee> findEmployeesEmployedBetween(LocalDate from, LocalDate to) {
		return entityManager.createQuery("""
				SELECT e FROM Employee e
				WHERE e.hireDate <= :to
				AND (e.endDate IS NULL OR e.endDate >= :from)
				""", Employee.class)
				.setParameter("from", from)
				.setParameter("to", to)
				.getResultList();
	}
}
