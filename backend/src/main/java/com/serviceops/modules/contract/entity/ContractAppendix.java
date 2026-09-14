package com.serviceops.modules.contract.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Ban ghi bat bien cua mot phu luc dieu chinh hop dong (NCL-04-CN-004). */
@Getter
@Setter
@Entity
@Table(name = "contract_appendices")
public class ContractAppendix extends BaseEntity {

	@Column(name = "contract_id", nullable = false)
	private Long contractId;

	@Column(nullable = false, length = 1000)
	private String content;

	/** So tien tang/giam; duong la tang, am la giam. */
	@Column(name = "adjustment_value", nullable = false, precision = 18, scale = 2)
	private BigDecimal adjustmentValue;

	@Column(name = "value_before", nullable = false, precision = 18, scale = 2)
	private BigDecimal valueBefore;

	@Column(name = "value_after", nullable = false, precision = 18, scale = 2)
	private BigDecimal valueAfter;

	@Column(name = "effective_date", nullable = false)
	private LocalDate effectiveDate;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}