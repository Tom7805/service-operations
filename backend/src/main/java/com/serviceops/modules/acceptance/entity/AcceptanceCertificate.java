package com.serviceops.modules.acceptance.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.acceptance.enums.ConfirmationChannel;
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
 * Phieu nghiem thu mot hang muc (work package) cua du an (NCL-12-CN-001).
 *
 * <p>Noi dung (cong viec, san pham ban giao) duoc chup lai o {@link AcceptanceItem} tai thoi diem
 * lap/nop lai; sau khi khach hang xac nhan (ACCEPTED) phieu bi khoa. {@link #contractMilestoneId} la
 * moc thanh toan ma Ke toan gan phieu vao (NCL-12-CN-003, QTN-25).</p>
 */
@Getter
@Setter
@Entity
@Table(name = "acceptance_certificates")
public class AcceptanceCertificate extends BaseEntity {

	@Column(name = "certificate_code", nullable = false, unique = true, length = 50)
	private String certificateCode;

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(name = "work_package_id", nullable = false)
	private Long workPackageId;

	@Column(nullable = false, length = 255)
	private String title;

	@Column(name = "accepted_value", nullable = false, precision = 18, scale = 2)
	private BigDecimal acceptedValue;

	@Column(length = 1000)
	private String note;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private AcceptanceStatus status = AcceptanceStatus.PENDING_CONFIRMATION;

	/** Lan nop thu may; tang moi lan nop lai sau khi khach hang tu choi. */
	@Column(name = "revision_no", nullable = false)
	private Integer revisionNo = 1;

	@Column(name = "contract_milestone_id", unique = true)
	private Long contractMilestoneId;

	@Column(name = "linked_by", length = 100)
	private String linkedBy;

	@Column(name = "linked_at")
	private LocalDateTime linkedAt;

	/** Nguoi dai dien phia khach hang da ky bien ban. */
	@Column(name = "signer_name", length = 255)
	private String signerName;

	@Column(name = "signed_date")
	private LocalDate signedDate;

	/** Duong dan bien ban nghiem thu mo phong da tai len. */
	@Column(name = "minutes_url", length = 500)
	private String minutesUrl;

	@Enumerated(EnumType.STRING)
	@Column(name = "confirmation_channel", columnDefinition = "VARCHAR(20)")
	private ConfirmationChannel confirmationChannel;

	/** Tai khoan da ghi nhan viec xac nhan vao he thong. */
	@Column(name = "confirmed_by", length = 100)
	private String confirmedBy;

	@Column(name = "confirmed_at")
	private LocalDateTime confirmedAt;

	@Column(name = "last_rejection_reason", length = 1000)
	private String lastRejectionReason;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
