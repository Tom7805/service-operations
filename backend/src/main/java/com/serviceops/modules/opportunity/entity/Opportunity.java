package com.serviceops.modules.opportunity.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
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

/**
 * Co hoi ban hang (NCL-03-CN-001). Moi co hoi bat buoc gan voi mot khach hang
 * da co ho so (customerId) — dieu kien bat dau cua story. Gia tri du kien
 * (expectedValue) la so thap phan duong (rang buoc khong am kiem soat o tang
 * service, TC-02). Giai doan khoi tao = {@link OpportunityStage#APPROACH}
 * (TC-01, QTN-06).
 */
@Getter
@Setter
@Entity
@Table(name = "opportunities")
public class Opportunity extends BaseEntity {

	@Column(nullable = false, length = 255)
	private String name;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "expected_value", nullable = false, precision = 18, scale = 2)
	private BigDecimal expectedValue;

	@Column(name = "expected_close_date")
	private LocalDate expectedCloseDate;

	@Column(name = "owner_id")
	private Long ownerId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private OpportunityStage stage;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private OpportunityStatus status = OpportunityStatus.OPEN;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
