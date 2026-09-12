package com.serviceops.modules.timesheet.repository;

import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Truy cap bang cham cong tuan (NCL-06-CN-002, Epic NCL-06).
 */
public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {

	/** Bang cham cong cua mot nhan su trong mot tuan (unique user + week). */
	Optional<Timesheet> findByUserIdAndWeekStartDate(Long userId, LocalDate weekStartDate);

	/** Bang cham cong theo trang thai — nguon cho hang cho duyet cua PM. */
	List<Timesheet> findByStatusOrderBySubmittedAtAsc(TimesheetStatus status);

	/**
	 * Tong gio cong cua mot nhan su theo tung ngay trong khoang ngay
	 * (NCL-06-CN-002 / TC-02 — kiem tra QTN-14 khi nop bang tuan).
	 *
	 * @return moi phan tu la {@code [workDate, totalHours]} (Object[2]).
	 */
	@Query("""
			SELECT e.workDate, COALESCE(SUM(e.hours), 0)
			FROM TimeEntry e
			WHERE e.userId = :userId AND e.workDate BETWEEN :weekFrom AND :weekTo
			GROUP BY e.workDate
			ORDER BY e.workDate
			""")
	List<Object[]> sumHoursPerDayBetween(@Param("userId") Long userId,
			@Param("weekFrom") LocalDate weekFrom, @Param("weekTo") LocalDate weekTo);
}
