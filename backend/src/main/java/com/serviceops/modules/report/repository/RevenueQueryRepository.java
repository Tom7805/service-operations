package com.serviceops.modules.report.repository;

import com.serviceops.modules.report.projection.RevenueProjection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public class RevenueQueryRepository {

	@PersistenceContext
	private EntityManager entityManager;

	/**
	 * Mọi dòng giờ công ĐÃ DUYỆT và tính phí có ngày làm việc trong kỳ, kèm hợp đồng và loại hợp đồng của dự án.
	 * Dòng đảo/sửa mang dấu nên cộng thẳng. Sắp theo ngày làm việc rồi theo id.
	 */
	public List<RevenueProjection> findApprovedBillableEntries(LocalDate from, LocalDate to) {
		return entityManager.createQuery("""
				SELECT new com.serviceops.modules.report.projection.RevenueProjection(e, c.id, c.contractType)
				FROM TimeEntry e, Task t, Project p, Contract c
				WHERE t.id = e.taskId
				AND p.id = t.projectId
				AND c.id = p.contractId
				AND e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.APPROVED
				AND e.billable = true
				AND e.workDate BETWEEN :from AND :to
				ORDER BY e.workDate ASC, e.id ASC
				""", RevenueProjection.class)
				.setParameter("from", from)
				.setParameter("to", to)
				.getResultList();
	}
}
