package com.serviceops.modules.timesheet.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Phien dong ho bam gio dang chay cua mot nhan su (NCL-06-CN-008). */
@Getter
@Setter
@Entity
@Table(name = "timesheet_timers")
public class TimesheetTimer extends BaseEntity {

	@Column(name = "user_id", nullable = false, unique = true)
	private Long userId;

	@Column(name = "task_id", nullable = false)
	private Long taskId;

	@Column(name = "started_at", nullable = false)
	private LocalDateTime startedAt;

	@Column(length = 1000, nullable = false)
	private String note;

	@Column(name = "billable", nullable = false)
	private Boolean billable = true;
}
