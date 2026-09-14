package com.serviceops.modules.quotation.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "quotes")
public class Quote extends BaseEntity {

	@Column(name = "opportunity_id", nullable = false)
	private Long opportunityId;

	@Column(nullable = false)
	private Integer version;

	@Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
	private BigDecimal totalAmount = BigDecimal.ZERO;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<QuoteItem> items = new ArrayList<>();

	public void addItem(QuoteItem item) {
		items.add(item);
		item.setQuote(this);
	}
}