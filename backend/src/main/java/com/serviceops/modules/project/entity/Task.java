package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.project.enums.TaskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "project_tasks")
public class Task extends BaseEntity {
	@Column(name = "project_id", nullable = false)
	private Long projectId;
	@Column(name = "work_package_id", nullable = false)
	private Long workPackageId;
	@Column(name = "parent_task_id")
	private Long parentTaskId;
	@Column(nullable = false, length = 255)
	private String name;
	@Column(columnDefinition = "TEXT")
	private String description;
	@Column(name = "expected_start_date")
	private LocalDate expectedStartDate;
	@Column(name = "expected_end_date")
	private LocalDate expectedEndDate;
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private TaskStatus status = TaskStatus.TODO;
	@Column(name = "created_by", length = 100)
	private String createdBy;
	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
