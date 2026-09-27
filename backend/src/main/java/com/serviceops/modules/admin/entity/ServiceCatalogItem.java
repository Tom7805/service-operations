package com.serviceops.modules.admin.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Mot dich vu trong danh muc dung chung (NCL-15-CN-001). Gia khong nam o day ma o {@link ServicePrice} theo
 * ngay hieu luc (QTN-28). {@link #nameNormalized} mang rang buoc UNIQUE de chan trung ten (TC-02).
 */
@Getter
@Setter
@Entity
@Table(name = "service_catalog_items")
public class ServiceCatalogItem extends BaseEntity {

	@Column(name = "code", length = 30, unique = true)
	private String code;

	@Column(name = "name", nullable = false)
	private String name;

	@Column(name = "name_normalized", nullable = false, unique = true)
	private String nameNormalized;

	@Column(name = "unit", nullable = false, length = 50)
	private String unit;

	@Column(name = "description", length = 1000)
	private String description;

	@Column(name = "active", nullable = false)
	private boolean active = true;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
