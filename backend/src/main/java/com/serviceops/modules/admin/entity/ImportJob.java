package com.serviceops.modules.admin.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.admin.enums.DuplicateAction;
import com.serviceops.modules.admin.enums.ImportStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Mot phien nhap du lieu tu tep (NCL-15-CN-004). Giu nguyen noi dung tep de buoc xac nhan nhap kiem tra lai
 * tren du lieu moi nhat thay vi tin ket qua xem truoc (ho so co the vua duoc tao o man hinh khac).
 */
@Getter
@Setter
@Entity
@Table(name = "import_jobs")
public class ImportJob extends BaseEntity {

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private ImportTargetType targetType;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "VARCHAR(30)")
	private ImportStatus status;

	@Column(name = "file_name", nullable = false)
	private String fileName;

	@Column(name = "file_content", nullable = false, columnDefinition = "MEDIUMTEXT")
	private String fileContent;

	@Column(name = "total_rows", nullable = false)
	private int totalRows;

	@Column(name = "valid_rows", nullable = false)
	private int validRows;

	@Column(name = "invalid_rows", nullable = false)
	private int invalidRows;

	@Column(name = "duplicate_rows", nullable = false)
	private int duplicateRows;

	@Column(name = "created_count", nullable = false)
	private int createdCount;

	@Column(name = "updated_count", nullable = false)
	private int updatedCount;

	@Column(name = "skipped_count", nullable = false)
	private int skippedCount;

	@Column(name = "failed_count", nullable = false)
	private int failedCount;

	@Enumerated(EnumType.STRING)
	@Column(name = "duplicate_action", columnDefinition = "VARCHAR(20)")
	private DuplicateAction duplicateAction;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "committed_by", length = 100)
	private String committedBy;

	@Column(name = "committed_at")
	private LocalDateTime committedAt;
}
