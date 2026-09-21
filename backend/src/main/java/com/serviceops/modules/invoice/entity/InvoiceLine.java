package com.serviceops.modules.invoice.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Mot dong cua hoa don. Voi hoa don theo moc (NCL-10-CN-002) dong nay gan voi
 * dung mot moc thanh toan cua hop dong qua {@code contractMilestoneId}.
 */
@Getter
@Setter
@Entity
@Table(name = "invoice_lines")
public class InvoiceLine extends BaseEntity {

	@Column(name = "invoice_id", nullable = false)
	private Long invoiceId;

	/** UNIQUE khop {@code uk_invoice_lines_milestone} (V76): mot moc chi nam trong mot hoa don. */
	@Column(name = "contract_milestone_id", unique = true)
	private Long contractMilestoneId;

	@Column(nullable = false, length = 500)
	private String description;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal amount;
}
