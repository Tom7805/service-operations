package com.serviceops.modules.invoice.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.invoice.enums.ProposalStatus;
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
 * De nghi xuat hoa don tu gio cong da duyet cua mot du an trong mot ky (NCL-10-CN-001, QTN-18).
 * Cac dong cua de nghi nam o {@link InvoiceProposalLine}.
 */
@Getter
@Setter
@Entity
@Table(name = "invoice_proposals")
public class InvoiceProposal extends BaseEntity {

	/** Ma de nghi duy nhat (IP-yyyyMMdd-xxxxxx), sinh o tang service. */
	@Column(name = "proposal_code", nullable = false, unique = true, length = 50)
	private String proposalCode;

	@Column(name = "project_id", nullable = false)
	private Long projectId;

	@Column(name = "contract_id", nullable = false)
	private Long contractId;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	/**
	 * NCL-02-CN-006 TC-02: khach hang goc truoc khi ho so bi gop vao ho so khac — null neu ban ghi chua tung
	 * bi chuyen. Chi ghi mot lan (lan gop dau tien), cac lan gop sau giu nguyen de truy duoc nguon goc.
	 */
	@Column(name = "original_customer_id")
	private Long originalCustomerId;

	@Column(name = "period_from", nullable = false)
	private LocalDate periodFrom;

	@Column(name = "period_to", nullable = false)
	private LocalDate periodTo;

	/** columnDefinition khai tuong minh de Hibernate khong suy ra kieu ENUM cua MySQL (cung quy uoc Invoice.status). */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private ProposalStatus status = ProposalStatus.PENDING;

	@Column(name = "labor_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal laborAmount;

	@Column(name = "expense_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal expenseAmount;

	@Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal totalAmount;

	@Column(length = 1000)
	private String note;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
