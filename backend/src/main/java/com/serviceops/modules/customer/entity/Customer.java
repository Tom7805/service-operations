package com.serviceops.modules.customer.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.customer.enums.CustomerStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

	/** Trang thai ho so (NCL-02-CN-006): ho so bi gop chuyen sang {@link CustomerStatus#MERGED}. */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20)")
	private CustomerStatus status = CustomerStatus.ACTIVE;

	/** Id cua ho so "giu lai" ma ho so nay da duoc gop vao, chi co gia tri khi status la MERGED. */
	@Column(name = "merged_into_id")
	private Long mergedIntoId;

	/** Thoi diem ho so nay bi gop vao ho so khac. */
	@Column(name = "merged_at")
	private LocalDateTime mergedAt;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	/**
	 * Nguoi phu trach ho so (QTN-01) — mac dinh la nguoi tao. Dung de tinh
	 * pham vi DEPARTMENT/SELF khi liet ke: phong ban cua khach hang duoc suy
	 * GIAN TIEP tu {@code users.department_id} cua chinh chu so huu nay tai
	 * thoi diem truy van, khong luu lap lai o day.
	 */
	@Column(name = "owner_id")
	private Long ownerId;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
