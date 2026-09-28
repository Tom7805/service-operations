package com.serviceops.modules.rate.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "employee_hourly_rates")
public class EmployeeHourlyRate extends BaseEntity {

	@Column(name = "employee_id", nullable = false)
	private Long employeeId;

	@Column(name = "hourly_rate", nullable = false, precision = 18, scale = 2)
	private BigDecimal hourlyRate;

	@Column(name = "effective_from", nullable = false)
	private LocalDate effectiveFrom;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;
}

