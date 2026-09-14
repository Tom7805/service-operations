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

/** Ban ghi bat bien cua mot lan gia han hop dong (NCL-04-CN-007). */
@Getter
@Setter
@Entity
@Table(name = "contract_renewals")
public class ContractRenewal extends BaseEntity {

	@Column(name = "contract_id", nullable = false)
	private Long contractId;

	@Column(name = "previous_end_date", nullable = false)
	private LocalDate previousEndDate;

	@Column(name = "new_end_date", nullable = false)
	private LocalDate newEndDate;

	/** So tien bo sung khi gia han; NULL/0 = gia han khong doi gia tri hop dong. */
	@Column(name = "additional_value", precision = 18, scale = 2)
	private BigDecimal additionalValue;

	@Column(name = "value_before", nullable = false, precision = 18, scale = 2)
	private BigDecimal valueBefore;

	@Column(name = "value_after", nullable = false, precision = 18, scale = 2)
	private BigDecimal valueAfter;

	@Column(length = 1000)
	private String notes;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
