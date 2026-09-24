package com.serviceops.modules.acceptance.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.acceptance.enums.AcceptanceDecisionType;
import com.serviceops.modules.acceptance.enums.ConfirmationChannel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lich su xac nhan/tu choi cua khach hang voi tung lan nop phieu (NCL-12-CN-002). Chi them moi,
 * khong sua — ly do tu choi cua cac lan truoc van tra cuu duoc khi co tranh chap.
 */
@Getter
@Setter
@Entity
@Table(name = "acceptance_decisions")
public class AcceptanceDecision extends BaseEntity {

	@Column(name = "certificate_id", nullable = false)
	private Long certificateId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private AcceptanceDecisionType decision;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private ConfirmationChannel channel;

	@Column(name = "revision_no", nullable = false)
	private Integer revisionNo;

	@Column(name = "signer_name", length = 255)
	private String signerName;

	@Column(name = "signed_date")
	private LocalDate signedDate;

	@Column(name = "minutes_url", length = 500)
	private String minutesUrl;

	@Column(length = 1000)
	private String reason;

	@Column(name = "recorded_by", length = 100)
	private String recordedBy;

	@Column(name = "recorded_at", nullable = false)
	private LocalDateTime recordedAt;
}
