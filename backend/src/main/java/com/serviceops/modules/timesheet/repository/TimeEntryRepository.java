package com.serviceops.modules.timesheet.repository;

import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Truy cap ban ghi gio cong (NCL-06-CN-001, Epic NCL-06 - Bang cham cong).
 *
 * <p>Ho tro ba nhom truy van cua story ghi gio cong theo cong viec:</p>
 * <ul>
 *   <li>doc bang gio cong cua chinh minh theo khoang ngay (luoi tuan);</li>
 *   <li>tim mot ban ghi cu the de sua/xoa (unique user + task + ngay);</li>
 *   <li>tong hop gio cong da ghi theo task — nguon du lieu tinh
 *       {@code usageRatio}/QTN-20 so voi {@code budget_hours}.</li>
 * </ul>
 */
public interface TimeEntryRepository extends JpaRepository<TimeEntry, Long> {

	/** Bang gio cong cua mot nhan su trong khoang ngay, sap theo ngay roi id. */
	List<TimeEntry> findByUserIdAndWorkDateBetweenOrderByIdAsc(
			Long userId, LocalDate workDateFrom, LocalDate workDateTo);

	/** Gio cong cua mot nhan su tren mot cong viec trong khoang ngay. */
	List<TimeEntry> findByUserIdAndTaskIdAndWorkDateBetweenOrderByIdAsc(
			Long userId, Long taskId, LocalDate workDateFrom, LocalDate workDateTo);

	/** Ban ghi gio cong cua chinh nhan su do tren mot cong viec trong mot ngay. */
	Optional<TimeEntry> findByUserIdAndTaskIdAndWorkDate(Long userId, Long taskId, LocalDate workDate);

	/**
	 * Tong gio cong da ghi cua mot cong viec, loc theo trang thai
	 * (VD: chi tinh DRAFT + SUBMITTED de canh bao gan vuot ngan sach QTN-20;
	 * chi tinh APPROVED khi cap nhat approved_hours sau khi duyet).
	 */
	@Query("""
			SELECT COALESCE(SUM(e.hours), 0)
			FROM TimeEntry e
			WHERE e.taskId = :taskId AND e.status IN :statuses
			""")
	BigDecimal sumHoursByTaskIdAndStatusIn(@Param("taskId") Long taskId,
			@Param("statuses") List<TimeEntryStatus> statuses);
}
