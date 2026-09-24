package com.serviceops.modules.report.repository;

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

	/** Tổng giờ công ĐÃ DUYỆT trong kỳ, tách phần tính phí; dòng đảo/sửa mang dấu nên cộng thẳng. */
	public ApprovedHours sumApprovedHours(LocalDate from, LocalDate to) {
		List<Object[]> rows = entityManager.createQuery("""
				SELECT e.billable, COALESCE(SUM(e.hours), 0)
				FROM TimeEntry e
				WHERE e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.APPROVED
				AND e.workDate BETWEEN :from AND :to
				GROUP BY e.billable
				""", Object[].class)
				.setParameter("from", from)
				.setParameter("to", to)
				.getResultList();

		BigDecimal billable = BigDecimal.ZERO;
		BigDecimal total = BigDecimal.ZERO;
		for (Object[] row : rows) {
			BigDecimal hours = (BigDecimal) row[1];
			total = total.add(hours);
			if (Boolean.TRUE.equals(row[0])) {
				billable = billable.add(hours);
			}
		}
		return new ApprovedHours(billable, total);
	}

	public record ApprovedHours(BigDecimal billableHours, BigDecimal totalHours) {
	}
}
