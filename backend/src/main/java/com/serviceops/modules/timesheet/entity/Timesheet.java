package com.serviceops.modules.timesheet.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
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
 * Bang cham cong tuan cua mot nhan su (NCL-06-CN-002, Epic NCL-06).
 *
 * <p>Tao khi nhan su nop tuan: {@code weekStartDate}/{@code weekEndDate} la
 * khoang ngay cua tuan, {@code totalHours} la tong gio cong da ghi. Rang buoc
 * {@code uk_timesheets_user_week} dam bao moi nhan su chi co mot bang cho mot
 * tuan — nop lai (sau bi tu choi) cap nhat la ban ghi nay.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "timesheets", uniqueConstraints = @UniqueConstraint(
		name = "uk_timesheets_user_week", columnNames = { "user_id", "week_start_date" }))
public class Timesheet extends BaseEntity {
	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "week_start_date", nullable = false)
	private LocalDate weekStartDate;

	@Column(name = "week_end_date", nullable = false)
	private LocalDate weekEndDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private TimesheetStatus status;

	/** Tong gio cong cua tuan tai thoi diem nop. */
	@Column(name = "total_hours", nullable = false, precision = 10, scale = 2)
	private BigDecimal totalHours = BigDecimal.ZERO;

	@Column(name = "submitted_by", length = 100)
	private String submittedBy;

	@Column(name = "submitted_at")
	private LocalDateTime submittedAt;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
