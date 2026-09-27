package com.serviceops.modules.acceptance.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.acceptance.enums.DeliverableType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** San pham ban giao gan voi mot hang muc cua du an (NCL-12-CN-004). */
@Getter
@Setter
@Entity
@Table(name = "deliverables")
public class Deliverable extends BaseEntity {

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(name = "work_package_id", nullable = false)
	private Long workPackageId;

	@Column(nullable = false, length = 255)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "deliverable_type", nullable = false, columnDefinition = "VARCHAR(30)")
	private DeliverableType deliverableType;

	@Column(length = 1000)
	private String description;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
