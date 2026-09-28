package com.serviceops.modules.profitability.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Nguong bien loi nhuan toi thieu toan cong ty (NCL-09-CN-004) - Ban giam doc (VT-01) cau
 * hinh, dung de so sanh voi {@code ProjectMarginRes.marginRate} sau moi lan tinh lai bien
 * loi nhuan cua bat ky du an nao. Chi giu 1 dong hien hanh (xem MarginThresholdSettingRepository).
 */
@Getter
@Setter
@Entity
@Table(name = "margin_threshold_settings")
public class MarginThresholdSetting extends BaseEntity {

	@Column(name = "min_margin_rate", nullable = false, precision = 6, scale = 4)
	private BigDecimal minMarginRate;

	@Column(name = "updated_by", length = 100)
	private String updatedBy;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
