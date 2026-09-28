package com.serviceops.modules.admin.entity;

import com.serviceops.common.enums.Currency;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Thong tin cong ty va moc ky tai chinh (NCL-15-CN-002) — mot dong duy nhat, khoa co dinh {@link #SINGLETON_ID}.
 * Khong ke thua {@code BaseEntity} vi khoa khong tu sinh.
 */
@Getter
@Setter
@Entity
@Table(name = "company_settings")
public class CompanySetting {

	public static final long SINGLETON_ID = 1L;

	@Id
	private Long id;

	@Column(name = "company_name", nullable = false)
	private String companyName;

	@Column(name = "tax_code", length = 50)
	private String taxCode;

	@Column(name = "address", length = 500)
	private String address;

	@Column(name = "phone", length = 30)
	private String phone;

	@Column(name = "email")
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(name = "currency", nullable = false, columnDefinition = "VARCHAR(10)")
	private Currency currency;

	@Column(name = "fiscal_year_start_month", nullable = false)
	private Integer fiscalYearStartMonth;

	@Column(name = "standard_working_days_per_month", nullable = false)
	private Integer standardWorkingDaysPerMonth;

	@Column(name = "updated_by", length = 100)
	private String updatedBy;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
