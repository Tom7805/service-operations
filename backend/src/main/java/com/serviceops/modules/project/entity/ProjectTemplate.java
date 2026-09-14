package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Mẫu dự án (NCL-05-CN-007): định nghĩa sẵn cây hạng mục, công việc và ngân sách giờ gợi ý
 * để dựng nhanh một dự án mới thay vì nhập lại các đầu việc quen thuộc.
 */
@Getter
@Setter
@Entity
@Table(name = "project_templates")
public class ProjectTemplate extends BaseEntity {

	@Column(nullable = false, unique = true, length = 50)
	private String code;

	@Column(nullable = false, length = 255)
	private String name;

	@Column(columnDefinition = "TEXT")
	private String description;

	@Column(name = "project_type", nullable = false, length = 30)
	private String projectType;

	@Column(nullable = false)
	private Boolean active = Boolean.TRUE;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
