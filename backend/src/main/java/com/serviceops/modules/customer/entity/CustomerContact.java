package com.serviceops.modules.customer.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.customer.enums.ContactRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Người liên hệ của khách hàng (NCL-02-CN-003). Mỗi khách hàng có thể có nhiều
 * người liên hệ nhưng chỉ duy nhất một người được đánh dấu {@link ContactRole#PRIMARY}
 * (đầu mối chính) tại một thời điểm.
 */
@Getter
@Setter
@Entity
@Table(name = "customer_contacts")
public class CustomerContact extends BaseEntity {

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "full_name", nullable = false, length = 255)
	private String fullName;

	@Column(name = "title", length = 255)
	private String title;

	@Column(name = "email", length = 255)
	private String email;

	@Column(name = "phone", length = 30)
	private String phone;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false, columnDefinition = "VARCHAR(20)")
	private ContactRole role;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
