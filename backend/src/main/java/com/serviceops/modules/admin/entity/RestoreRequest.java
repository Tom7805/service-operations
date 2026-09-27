package com.serviceops.modules.admin.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.admin.enums.RestoreStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Yeu cau phuc hoi hai buoc (QTN-30). Chi luu bam SHA-256 cua ma xac nhan — ma goc chi tra ve mot lan
 * o buoc 1, lo bang nay cung khong dung duoc de xac nhan.
 */
@Getter
@Setter
@Entity
@Table(name = "restore_requests")
public class RestoreRequest extends BaseEntity {

	@Column(name = "backup_id", nullable = false)
	private Long backupId;

	@Column(name = "requested_by", nullable = false, length = 100)
	private String requestedBy;

	@Column(name = "token_hash", nullable = false, length = 64)
	private String tokenHash;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "VARCHAR(20)")
	private RestoreStatus status;

	/** So lan buoc 2 gui sai ma hoac sai mat khau; vuot nguong thi yeu cau bi huy (EXPIRED). */
	@Column(name = "failed_attempts", nullable = false)
	private int failedAttempts;

	@Column(name = "requested_at", nullable = false)
	private LocalDateTime requestedAt;

	@Column(name = "expires_at", nullable = false)
	private LocalDateTime expiresAt;

	@Column(name = "completed_at")
	private LocalDateTime completedAt;

	@Column(name = "error_message", length = 1000)
	private String errorMessage;
}
