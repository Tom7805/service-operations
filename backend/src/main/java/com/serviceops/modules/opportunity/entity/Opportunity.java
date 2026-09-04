package com.serviceops.modules.opportunity.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.opportunity.enums.LossReason;
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

	/** Xac suat trung/dong co hoi (0-100%), cap nhat tuong ung voi moi giai doan (NCL-03-CN-002, TC-01). */
	@Column(precision = 5, scale = 2)
	private BigDecimal probability;

	/**
	 * Ly do thua (NCL-03-CN-005, TC-02) — chi co gia tri khi co hoi dong voi ket qua
	 * {@link OpportunityStage#LOST}, luon la {@code null} voi ket qua {@link OpportunityStage#WON}.
	 */
	@Enumerated(EnumType.STRING)
	@Column(name = "loss_reason", columnDefinition = "VARCHAR(30)")
	private LossReason lossReason;

	/** Ghi chu chi tiet them cho ket qua dong co hoi (NCL-03-CN-005), khong bat buoc. */
	@Column(name = "close_reason_detail", length = 500)
	private String closeReasonDetail;

	/** Ten doi thu canh tranh neu co (NCL-03-CN-005), khong bat buoc. */
	@Column(name = "competitor_name", length = 255)
	private String competitorName;

	/** Thoi diem co hoi duoc dong voi ket qua thang/thua (NCL-03-CN-005). */
	@Column(name = "closed_at")
	private LocalDateTime closedAt;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
