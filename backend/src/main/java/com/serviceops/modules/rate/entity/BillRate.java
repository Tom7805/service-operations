package com.serviceops.modules.rate.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "bill_rates")
public class BillRate extends BaseEntity {

	@Column(name = "professional_role", nullable = false, length = 255)
	private String professionalRole;

	@Column(name = "daily_rate", nullable = false, precision = 18, scale = 2)
	private BigDecimal dailyRate;

	@Column(name = "effective_from", nullable = false)
	private LocalDate effectiveFrom;
}