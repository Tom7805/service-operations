package com.serviceops.modules.quotation.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "quote_items")
public class QuoteItem extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "quote_id", nullable = false)
	private Quote quote;

	@Column(name = "professional_role", nullable = false, length = 255)
	private String professionalRole;

	@Column(name = "work_days", nullable = false, precision = 10, scale = 2)
	private BigDecimal workDays;

	@Column(name = "unit_rate", precision = 18, scale = 2)
	private BigDecimal unitRate;

	@Column(precision = 18, scale = 2)
	private BigDecimal amount;
}