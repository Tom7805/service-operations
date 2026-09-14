package com.serviceops.modules.timesheet.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
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
 * NCL-06-CN-001..004: bang cham cong theo tuan cua mot nhan su — gom cac dong gio cong
 * (TimeEntry) trong khoang {@code weekStartDate}..{@code weekEndDate}.
 */
@Getter
@Setter
@Entity
@Table(name = "timesheets")
public class Timesheet extends BaseEntity {

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "week_start_date", nullable = false)
	private LocalDate weekStartDate;

	@Column(name = "week_end_date", nullable = false)
	private LocalDate weekEndDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private TimesheetStatus status = TimesheetStatus.DRAFT;

	@Column(name = "total_hours", nullable = false, precision = 6, scale = 2)
	private BigDecimal totalHours = BigDecimal.ZERO;

	@Column(name = "submitted_by")
	private Long submittedBy;

	@Column(name = "submitted_at")
	private LocalDateTime submittedAt;

	@Column(name = "approved_by")
	private Long approvedBy;

	@Column(name = "approved_at")
	private LocalDateTime approvedAt;

	/** NCL-06-CN-004: nguoi (quan ly du an) da tu choi lan gan nhat; null neu chua tung bi tu choi. */
	@Column(name = "rejected_by")
	private Long rejectedBy;

	@Column(name = "rejected_at")
	private LocalDateTime rejectedAt;

	/** Ly do tu choi lan gan nhat — bat buoc phai co khi tu choi (NCL-06-CN-004-TC-02). */
	@Column(name = "reject_reason", length = 1000)
	private String rejectReason;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
