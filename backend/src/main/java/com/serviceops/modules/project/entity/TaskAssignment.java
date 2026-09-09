package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "project_task_assignments", uniqueConstraints = @UniqueConstraint(
		name = "uk_project_task_assignments_task_user", columnNames = { "task_id", "user_id" }))
public class TaskAssignment extends BaseEntity {
	@Column(name = "task_id", nullable = false)
	private Long taskId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "expected_start_date")
	private LocalDate expectedStartDate;

	@Column(name = "expected_end_date")
	private LocalDate expectedEndDate;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}