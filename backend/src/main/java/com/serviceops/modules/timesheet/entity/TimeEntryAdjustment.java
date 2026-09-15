package com.serviceops.modules.timesheet.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Dau vet mot lan dieu chinh gio cong da duyet bang but toan dao (NCL-06-CN-005, QTN-11).
 *
 * <p>Khong sua/xoa {@link TimeEntry} goc — ban ghi nay chi noi ba dong lai voi nhau de
 * tra cuu duoc toan bo lich su dieu chinh cua mot dong gio cong da duyet:</p>
 * <ul>
 *   <li>{@code originalEntryId} — dong goc (giu nguyen, khong doi).</li>
 *   <li>{@code reversalEntryId} — dong dao, so gio am dung bang dong goc.</li>
 *   <li>{@code correctedEntryId} — dong ghi lai so gio dung.</li>
 * </ul>
 */
@Getter
@Setter
@Entity
@Table(name = "timesheet_entry_adjustments")
public class TimeEntryAdjustment extends BaseEntity {

	@Column(name = "original_entry_id", nullable = false)
	private Long originalEntryId;

	@Column(name = "reversal_entry_id", nullable = false)
	private Long reversalEntryId;

	@Column(name = "corrected_entry_id", nullable = false)
	private Long correctedEntryId;

	@Column(name = "task_id", nullable = false)
	private Long taskId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "work_date", nullable = false)
	private LocalDate workDate;

	/** Ly do dieu chinh — bat buoc phai co (NCL-06-CN-005-TC-01). */
	@Column(nullable = false, length = 1000)
	private String reason;

	@Column(name = "adjusted_by", length = 100)
	private String adjustedBy;

	@Column(name = "adjusted_at", nullable = false)
	private LocalDateTime adjustedAt;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
