package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "work_packages")
public class WorkPackage extends BaseEntity {
	@Column(name = "project_id", nullable = false)
	private Long projectId;
	@Column(name = "parent_id")
	private Long parentId;
	@Column(nullable = false, length = 255)
	private String name;
	@Column(columnDefinition = "TEXT")
	private String description;
	@Column(name = "sort_order", nullable = false)
	private Integer sortOrder = 0;
	@Column(name = "created_by", length = 100)
	private String createdBy;
	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
