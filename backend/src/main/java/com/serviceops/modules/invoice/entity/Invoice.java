package com.serviceops.modules.invoice.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.invoice.enums.InvoiceSource;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
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
 * Hoa don (Epic NCL-10). Bang dung chung cho moi nguon phat sinh hoa don; hien tai chi
 * {@link InvoiceSource#RECURRING} (NCL-10-CN-005) tao ban ghi o day, cac nguon con lai
 * (NCL-10-CN-001/002) se bo sung o cac story sau ma khong doi cau truc bang.
 */
@Getter
@Setter
@Entity
@Table(name = "invoices")
public class Invoice extends BaseEntity {

	/** Ma hoa don duy nhat (HD-yyyyMM-xxxx), sinh tu dong o tang service. */
	@Column(name = "invoice_number", nullable = false, unique = true, length = 50)
	private String invoiceNumber;

	@Column(name = "contract_id", nullable = false)
	private Long contractId;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	/** Du an lien quan, NULL voi hoa don dinh ky khong gan mot du an cu the. */
	@Column(name = "project_id")
	private Long projectId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private InvoiceSource source;

	/** Ky ma hoa don dinh ky ghi nhan doanh thu (thang lap hoa don). NULL neu khong ap dung. */
	@Column(name = "period_start")
	private LocalDate periodStart;

	@Column(name = "period_end")
	private LocalDate periodEnd;

	@Column(name = "issue_date", nullable = false)
	private LocalDate issueDate;

	@Column(name = "due_date")
	private LocalDate dueDate;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;

	@Column(nullable = false, length = 10)
	private String currency = "VND";

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private InvoiceStatus status = InvoiceStatus.DRAFT;

	@Column(length = 500)
	private String notes;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
