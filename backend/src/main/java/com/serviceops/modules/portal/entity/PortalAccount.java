package com.serviceops.modules.portal.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Tai khoan cong cua mot nguoi lien he khach hang (NCL-13-CN-001, QTN-26).
 *
 * <p>Dang nhap bang {@link #userId} (bang {@code users}, vai tro VT-09). Trang thai khoa/mo doc tu
 * {@code users.status} — mot nguon su that; bang nay chi luu ly do va nguoi doi trang thai gan nhat.
 * {@link #customerId} la khach hang ma tai khoan duoc xem du lieu, chot tai thoi diem cap.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "portal_accounts")
public class PortalAccount extends BaseEntity {

	@Column(name = "user_id", nullable = false, unique = true)
	private Long userId;

	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "contact_id", nullable = false, unique = true)
	private Long contactId;

	@Column(name = "status_reason", length = 500)
	private String statusReason;

	@Column(name = "status_changed_by", length = 100)
	private String statusChangedBy;

	@Column(name = "status_changed_at")
	private LocalDateTime statusChangedAt;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
