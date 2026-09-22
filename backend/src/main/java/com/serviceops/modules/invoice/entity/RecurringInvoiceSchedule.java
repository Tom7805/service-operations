package com.serviceops.modules.invoice.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Dieu khoan lap hoa don dinh ky cua mot hop dong duy tri (NCL-10-CN-005). Moi hop dong
 * toi da mot dieu khoan dang hieu luc (UNIQUE(contract_id)); {@code lastGeneratedPeriod}
 * (dang "yyyy-MM") chong sinh trung hoa don cho cung mot ky khi tac vu chay lai nhieu lan
 * trong cung ngay.
 */
@Getter
@Setter
@Entity
@Table(name = "recurring_invoice_schedules")
public class RecurringInvoiceSchedule extends BaseEntity {

	@Column(name = "contract_id", nullable = false, unique = true)
	private Long contractId;

	/** Ngay trong thang de lap hoa don (1-28, tranh cac thang khong co ngay 29-31). */
	@Column(name = "billing_day_of_month", nullable = false)
	private Integer billingDayOfMonth;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;

	@Column(nullable = false, length = 10)
	private String currency = "VND";

	@Column(nullable = false)
	private Boolean active = true;

	/** Ky (yyyy-MM) da sinh hoa don gan nhat; NULL neu chua tung sinh. */
	@Column(name = "last_generated_period", length = 7)
	private String lastGeneratedPeriod;

	@Column(length = 500)
	private String notes;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;
}
