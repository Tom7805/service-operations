package com.serviceops.modules.customer.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "customers")
public class Customer extends BaseEntity {

	@Column(nullable = false, unique = true, length = 20)
	private String code;

	@Column(nullable = false, length = 255)
	private String name;

	@Column(name = "tax_code", length = 50)
	private String taxCode;

	@Column(length = 255)
	private String industry;

	@Column(name = "company_size", length = 50)
	private String companySize;

	@Column(length = 50)
	private String priority;

	@Column(length = 500)
	private String address;

	@Column(name = "phone", length = 30)
	private String phone;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
