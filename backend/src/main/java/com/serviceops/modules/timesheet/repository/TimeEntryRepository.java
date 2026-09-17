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
	 * Da co ban ghi (bat ky trang thai/vai tro nao) cho cap user/task/ngay nay chua.
	 *
	 * <p>Thay {@link #findByUserIdAndTaskIdAndWorkDate} lam dieu kien chan tao trung o
	 * {@code TimeEntryServiceImpl#create} — sau khi bo rang buoc duy nhat DB (NCL-06-CN-005,
	 * migration V60) mot cap co the co nhieu hon mot dong (goc + dao + sua), khien phuong thuc
	 * tra {@code Optional} nem loi khi co nhieu hon mot ket qua.</p>
	 */
	boolean existsByUserIdAndTaskIdAndWorkDate(Long userId, Long taskId, LocalDate workDate);

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

	/** Tong gio cong da ghi cua mot nhan su trong mot ngay (tran gio/ngay). */
	@Query("""
			SELECT COALESCE(SUM(e.hours), 0)
			FROM TimeEntry e
			WHERE e.userId = :userId AND e.workDate = :workDate
			""")
	BigDecimal sumHoursByUserIdAndWorkDate(@Param("userId") Long userId, @Param("workDate") LocalDate workDate);

	/**
	 * Cac dong gio cong DA DUYET va con la dong GOC (chua dao/sua) cua mot nhom cong viec —
	 * nguon du lieu cho danh sach "co the dieu chinh" ma PM chon truc tiep thay vi phai tu
	 * biet truoc Project ID/Task ID/Entry ID (NCL-06-CN-005).
	 */
	@Query("""
			SELECT e FROM TimeEntry e
			WHERE e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.APPROVED
			AND e.type = com.serviceops.modules.timesheet.enums.TimeEntryType.ORIGINAL
			AND e.taskId IN :taskIds
			ORDER BY e.workDate DESC, e.id DESC
			""")
	List<TimeEntry> findApprovedOriginalEntriesByTaskIdIn(@Param("taskIds") List<Long> taskIds);

	/**
	 * Danh sach nhan su co dong gio cong DRAFT trong mot tuan (NCL-06-CN-009).
	 *
	 * <p>Ung vien "chua nop bang cham cong": co gio cong ghi trong tuan nhung con
	 * o trang thai nhap, chua chuyen SUBMITTED (tuc chua goi API nop tuan).</p>
	 */
	@Query("""
			SELECT DISTINCT e.userId
			FROM TimeEntry e
			WHERE e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.DRAFT
			AND e.workDate BETWEEN :weekFrom AND :weekTo
			""")
	List<Long> findDistinctUserIdsWithDraftEntriesBetween(
			@Param("weekFrom") LocalDate weekFrom, @Param("weekTo") LocalDate weekTo);

	/**
	 * Cac dong gio cong con NHAP (DRAFT) cua mot nhom cong viec — dung khi dong du an
	 * (NCL-05-CN-006) de don sach cac dong nhap con sot lai truoc khi du an tro thanh
	 * "ho so lich su chi doc": dong NHAP chua tung duoc nop/duyet nen khong anh huong
	 * gio cong da duyet/doanh thu, xoa duoc an toan thay vi de mac ket vinh vien (khong
	 * con sua/xoa duoc qua giao dien vi du an da dong, nhung van tinh vao so dong can
	 * nop cua bang cham cong tuan).
	 */
	List<TimeEntry> findByTaskIdInAndStatus(List<Long> taskIds, TimeEntryStatus status);

	/**
	 * Tong gio cong DA DUYET cua tung cong viec trong mot khoang ngay, nguon du lieu de
	 * quy ve ty trong gio cong theo du an khi phan bo chi phi chung (NCL-08-CN-005 / QTN-29).
	 * Tra ve mang {@code [taskId, tongGio]}; khong dung entity Task o day de tranh phu thuoc
	 * nguoc tu module chi phi/ky sang module cham cong.
	 */
	@Query("""
			SELECT e.taskId, COALESCE(SUM(e.hours), 0)
			FROM TimeEntry e
			WHERE e.status = com.serviceops.modules.timesheet.enums.TimeEntryStatus.APPROVED
			AND e.workDate BETWEEN :from AND :to
			GROUP BY e.taskId
			""")
	List<Object[]> sumApprovedHoursGroupByTaskIdBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
