package com.serviceops.modules.report.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Truy vấn tổng hợp cho báo cáo giờ công theo nhân sự (NCL-11-CN-006).
 *
 * <p>{@code TimeEntry.taskId}/{@code Task.projectId} là các cột khóa ngoại thường (không phải quan hệ JPA), nên gộp
 * ({@code GROUP BY}) trực tiếp bằng JPQL với điều kiện nối tường minh {@code e.taskId = t.id}, giống cách
 * {@code TimeEntryRepository#sumApprovedHoursGroupByTaskIdBetween} đã làm ở mức công việc — ở đây gộp thêm một mức
 * (dự án) nên cần join sang {@code Task} để lấy {@code projectId}.</p>
 */
@Repository
public class TimesheetQueryRepository {

	@PersistenceContext
	private EntityManager entityManager;

	/**
	 * Tổng giờ công ĐÃ DUYỆT trong kỳ của các dự án cho trước, gộp theo (nhân sự, dự án, có tính phí hay không).
	 * Dòng đảo/sửa mang dấu nên cộng thẳng (giống {@code ProjectPerformanceReportServiceImpl}).
	 */
	public List<TimesheetHourRow> sumApprovedHoursByUserAndProject(List<Long> projectIds, LocalDate from,
			LocalDate to) {
		if (projectIds.isEmpty()) {
			return List.of();
		}
		return entityManager.createQuery("""
				SELECT new com.serviceops.modules.report.repository.TimesheetHourRow(
						e.userId, t.projectId, e.billable, SUM(e.hours))
				FROM TimeEntry e, Task t
				WHERE e.taskId = t.id
				AND t.projectId IN :projectIds
				AND e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.APPROVED
				AND e.workDate BETWEEN :from AND :to
				GROUP BY e.userId, t.projectId, e.billable
				""", TimesheetHourRow.class)
				.setParameter("projectIds", projectIds)
				.setParameter("from", from)
				.setParameter("to", to)
				.getResultList();
	}

	/** Một dòng gộp: tổng giờ của một nhân sự trên một dự án trong kỳ, tách theo có tính phí hay không. */
	public record TimesheetHourRow(Long userId, Long projectId, Boolean billable, BigDecimal hours) {
	}
}
