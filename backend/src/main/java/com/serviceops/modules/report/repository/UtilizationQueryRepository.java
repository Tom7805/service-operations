package com.serviceops.modules.report.repository;

import com.serviceops.modules.identity.employee.entity.Employee;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class UtilizationQueryRepository {

	@PersistenceContext
	private EntityManager entityManager;

	/**
	 * Nhân sự có thời gian làm việc (hireDate đến endDate, để trống là còn làm) giao với kỳ, nạp sẵn tài khoản và bộ phận
	 * để không phát sinh truy vấn phụ cho từng dòng.
	 */
	public List<Employee> findEmployeesEmployedBetween(LocalDate from, LocalDate to) {
		return entityManager.createQuery("""
				SELECT e FROM Employee e
				JOIN FETCH e.user
				LEFT JOIN FETCH e.department
				WHERE e.hireDate <= :to
				AND (e.endDate IS NULL OR e.endDate >= :from)
				""", Employee.class)
				.setParameter("from", from)
				.setParameter("to", to)
				.getResultList();
	}

	/** Tổng giờ công ĐÃ DUYỆT và tính phí trong kỳ theo tài khoản; dòng đảo/sửa mang dấu nên cộng thẳng. */
	public Map<Long, BigDecimal> sumApprovedBillableHoursByUser(LocalDate from, LocalDate to) {
		List<Object[]> rows = entityManager.createQuery("""
				SELECT e.userId, SUM(e.hours)
				FROM TimeEntry e
				WHERE e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.APPROVED
				AND e.billable = true
				AND e.workDate BETWEEN :from AND :to
				GROUP BY e.userId
				""", Object[].class)
				.setParameter("from", from)
				.setParameter("to", to)
				.getResultList();

		Map<Long, BigDecimal> hoursByUser = new HashMap<>();
		for (Object[] row : rows) {
			hoursByUser.put((Long) row[0], (BigDecimal) row[1]);
		}
		return hoursByUser;
	}
}
