package com.serviceops.modules.invoice.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.invoice.enums.ProposalLineType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mot dong cua de nghi xuat hoa don (NCL-10-CN-001): dong gio cong ({@link ProposalLineType#LABOR}, gan
 * voi {@code timeEntryId}) hoac phieu chi phi tinh lai ({@link ProposalLineType#EXPENSE}, gan voi
 * {@code projectExpenseId}). Ca hai cot tham chieu deu co UNIQUE de mot dong khong the vao hai de nghi.
 */
@Getter
@Setter
@Entity
@Table(name = "invoice_proposal_lines")
public class InvoiceProposalLine extends BaseEntity {

	@Column(name = "invoice_proposal_id", nullable = false)
	private Long invoiceProposalId;

	@Enumerated(EnumType.STRING)
	@Column(name = "line_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private ProposalLineType lineType;

	@Column(name = "time_entry_id", unique = true)
	private Long timeEntryId;

	@Column(name = "project_expense_id", unique = true)
	private Long projectExpenseId;

	/** Ngay cong (dong gio cong) hoac ngay phat sinh (phieu chi phi). */
	@Column(name = "line_date", nullable = false)
	private LocalDate lineDate;

	/** Nhan su thuc hien dong gio cong; {@code null} voi dong chi phi. */
	@Column(name = "user_id")
	private Long userId;

	/** So gio (mang dau khi la dong dao QTN-11); {@code null} voi dong chi phi. */
	@Column(precision = 10, scale = 2)
	private BigDecimal hours;

	/** Don gia GIO ap dung tai ngay cong (da nhan he so loai hinh cong viec); {@code null} voi dong chi phi. */
	@Column(name = "unit_rate", precision = 18, scale = 4)
	private BigDecimal unitRate;

	@Column(nullable = false, length = 500)
	private String description;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;
}
