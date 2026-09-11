package com.serviceops.modules.timesheet.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
 * Rang buoc {@code uk_timesheet_entries_user_task_date} dam bao moi cap
 * (nhan su, cong viec, ngay) chi co mot dong — ghi lai la ghi de.</p>
 *
 * <p>Gio cong chi cong vao {@code approved_hours} cua task (dung de tinh
 * {@code usageRatio}/QTN-20 voi {@code budget_hours}) sau khi ban ghi o trang
 * thai {@link TimeEntryStatus#APPROVED}; ban ghi moi luon la DRAFT.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "timesheet_entries", uniqueConstraints = @UniqueConstraint(
		name = "uk_timesheet_entries_user_task_date", columnNames = { "user_id", "task_id", "work_date" }))
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

	@Column(length = 1000)
	private String note;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
