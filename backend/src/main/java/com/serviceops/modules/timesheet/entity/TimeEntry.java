package com.serviceops.modules.timesheet.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimeEntryType;
import com.serviceops.modules.timesheet.enums.WorkType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Ban ghi gio cong theo cong viec (NCL-06-CN-001, Epic NCL-06 - Bang cham cong).
 *
 * <p>Moi ban ghi la so gio ({@code hours}) ma mot nhan su ({@code userId})
 * da lam tren mot cong viec ({@code taskId}) trong mot ngay ({@code workDate}).
 * Truoc day co rang buoc duy nhat (user, task, ngay) — da bo (NCL-06-CN-005,
 * migration V60) vi mot lan dieu chinh bang but toan dao sinh them hai dong
 * ({@link TimeEntryType#REVERSAL}/{@link TimeEntryType#CORRECTION}) cung ba
 * gia tri nay voi dong goc. Quy tac "khong tao hai dong {@code ORIGINAL} cho
 * cung user/task/ngay" nay chuyen sang kiem tra o tang ung dung
 * ({@code TimeEntryServiceImpl#create}).</p>
 *
 * <p>Gio cong chi cong vao {@code approved_hours} cua task (dung de tinh
 * {@code usageRatio}/QTN-20 voi {@code budget_hours}) sau khi ban ghi o trang
 * thai {@link TimeEntryStatus#APPROVED}; ban ghi moi luon la DRAFT.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "timesheet_entries")
public class TimeEntry extends BaseEntity {
	@Column(name = "task_id", nullable = false)
	private Long taskId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "work_date", nullable = false)
	private LocalDate workDate;

	/** So gio cong da lam (0.01 tro len), khong am, khong bang 0. */
	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal hours;

	@Enumerated(EnumType.STRING)
	@Column(name = "entry_status", nullable = false, columnDefinition = "VARCHAR(20)")
	private TimeEntryStatus status = TimeEntryStatus.DRAFT;

	/**
	 * Vai tro cua ban ghi trong luong dieu chinh bang but toan dao (NCL-06-CN-005).
	 * Ban ghi ghi qua luong binh thuong (CN-001) luon la {@code ORIGINAL}.
	 */
	@Enumerated(EnumType.STRING)
	@Column(name = "entry_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private TimeEntryType type = TimeEntryType.ORIGINAL;

	@Column(length = 1000)
	private String note;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "billable", nullable = false)
	private Boolean billable = true;

	/** Loai hinh cong viec (NCL-07-CN-006) — quyet dinh he so nhan don gia khi tinh doanh thu. */
	@Enumerated(EnumType.STRING)
	@Column(name = "work_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private WorkType workType = WorkType.NORMAL;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
