package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.project.enums.ProjectStatus;
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

@Getter
@Setter
@Entity
@Table(name = "projects")
public class Project extends BaseEntity {

	@Column(name = "project_code", nullable = false, unique = true, length = 50)
	private String projectCode;

	@Column(nullable = false, length = 255)
	private String name;

	@Column(name = "contract_id", nullable = false)
	private Long contractId;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "project_type", nullable = false, length = 30)
	private String projectType;

	@Column(name = "limit_value", precision = 18, scale = 2)
	private BigDecimal limitValue;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "expected_end_date", nullable = false)
	private LocalDate expectedEndDate;

	@Column(name = "project_manager_id", nullable = false)
	private Long projectManagerId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private ProjectStatus status = ProjectStatus.RUNNING;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}