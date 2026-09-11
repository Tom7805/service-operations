package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * NCL-05-CN-008: moc tien do cua du an (ten, ngay ke hoach, ngay thuc te).
 * Trang thai dung han/cham KHONG luu DB ma tinh dong khi doc (MilestoneProgressStatus).
 */
@Getter
@Setter
@Entity
@Table(name = "project_milestones")
public class ProjectMilestone extends BaseEntity {

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(nullable = false, length = 255)
	private String name;

	@Column(columnDefinition = "TEXT")
	private String description;

	@Column(name = "planned_date", nullable = false)
	private LocalDate plannedDate;

	/** Ngay thuc te hoan thanh moc; null nghia la chua hoan thanh. */
	@Column(name = "actual_date")
	private LocalDate actualDate;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
