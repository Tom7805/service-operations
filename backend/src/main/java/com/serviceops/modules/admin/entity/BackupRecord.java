package com.serviceops.modules.admin.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.admin.enums.BackupStatus;
import com.serviceops.modules.admin.enums.BackupTrigger;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Mot ban sao luu du lieu (NCL-15-CN-003). Tep JSON nam trong {@code app.backup.dir}; {@link #checksumSha256}
 * dung de phat hien tep bi sua / hong truoc khi phuc hoi (TC-02).
 */
@Getter
@Setter
@Entity
@Table(name = "backup_records")
public class BackupRecord extends BaseEntity {

	@Column(name = "code", length = 40, unique = true)
	private String code;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "VARCHAR(20)")
	private BackupStatus status;

	@Enumerated(EnumType.STRING)
	@Column(name = "trigger_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private BackupTrigger triggerType;

	@Column(name = "file_name")
	private String fileName;

	@Column(name = "size_bytes")
	private Long sizeBytes;

	@Column(name = "checksum_sha256", length = 64)
	private String checksumSha256;

	@Column(name = "table_count")
	private Integer tableCount;

	@Column(name = "row_count")
	private Long rowCount;

	@Column(name = "note", length = 500)
	private String note;

	@Column(name = "error_message", length = 1000)
	private String errorMessage;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "started_at", nullable = false)
	private LocalDateTime startedAt;

	@Column(name = "completed_at")
	private LocalDateTime completedAt;
}
