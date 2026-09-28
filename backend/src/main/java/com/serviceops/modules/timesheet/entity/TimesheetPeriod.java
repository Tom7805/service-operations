package com.serviceops.modules.timesheet.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.timesheet.enums.PeriodStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Ky cham cong (thuong la mot thang) dung de khoa/mo hang loat gio cong theo
 * khoang ngay (Epic NCL-06).
 *
 * <p>Bang nay duoc tao truoc boi story dieu chinh but toan dao (NCL-06-CN-005,
 * TC-03) de co cho kiem tra "ky chua dong goc da bi khoa" khi dieu chinh; man
 * hinh quan tri khoa/mo ky day du thuoc story NCL-06-CN-006.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "timesheet_periods")
public class TimesheetPeriod extends BaseEntity {

	@Column(name = "period_start", nullable = false, unique = true)
	private LocalDate periodStart;

	@Column(name = "period_end", nullable = false)
	private LocalDate periodEnd;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private PeriodStatus status = PeriodStatus.OPEN;

	@Column(name = "locked_by", length = 100)
	private String lockedBy;

	@Column(name = "locked_at")
	private LocalDateTime lockedAt;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
