package com.serviceops.modules.invoice.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Hoa don gui khach hang (Epic NCL-10). Tong tien cac hoa don chua huy cua mot
 * hop dong la "tong da xuat hoa don" ma QTN-19 so voi gia tri hop dong.
 */
@Getter
@Setter
@Entity
@Table(name = "invoices")
public class Invoice extends BaseEntity {

	/** Ma hoa don duy nhat (INV-yyyyMMdd-xxxxxx), sinh o tang service. */
	@Column(name = "invoice_code", nullable = false, unique = true, length = 50)
	private String invoiceCode;

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

	/** columnDefinition khai tuong minh de Hibernate khong suy ra kieu ENUM cua MySQL (cung quy uoc Contract.status). */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(30)")
	private InvoiceStatus status = InvoiceStatus.ISSUED;

	@Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal totalAmount;

	/** So ngay thanh toan mac dinh khi hoa don khong khai bao han thanh toan (khop V79). */
	public static final int DEFAULT_PAYMENT_TERM_DAYS = 30;

	@Column(name = "invoice_date", nullable = false)
	private LocalDate invoiceDate;

	/**
	 * Han thanh toan (NCL-10-CN-004): qua ngay nay ma con so con phai thu thi hoa don bi tinh la cong no
	 * qua han. Neu noi tao khong dat thi mac dinh {@code invoiceDate + 30 ngay}.
	 */
	@Column(name = "due_date", nullable = false)
	private LocalDate dueDate;

	@Column(length = 1000)
	private String note;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@PrePersist
	void applyDefaultDueDate() {
		if (dueDate == null && invoiceDate != null) {
			dueDate = invoiceDate.plusDays(DEFAULT_PAYMENT_TERM_DAYS);
		}
	}
}
