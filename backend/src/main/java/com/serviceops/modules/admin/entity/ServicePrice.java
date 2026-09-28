package com.serviceops.modules.admin.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot moc gia cua dich vu (QTN-28). Bat bien: doi gia la them moc moi voi {@link #effectiveFrom} khac,
 * cac moc cu duoc giu lai de bao gia / hoa don lap truoc do van giai thich duoc.
 */
@Getter
@Setter
@Entity
@Table(name = "service_prices", uniqueConstraints = @UniqueConstraint(name = "uq_service_prices_item_date",
		columnNames = {"service_item_id", "effective_from"}))
public class ServicePrice extends BaseEntity {

	@Column(name = "service_item_id", nullable = false)
	private Long serviceItemId;

	@Column(name = "price", nullable = false, precision = 18, scale = 2)
	private BigDecimal price;

	@Column(name = "effective_from", nullable = false)
	private LocalDate effectiveFrom;

	@Column(name = "note", length = 500)
	private String note;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
