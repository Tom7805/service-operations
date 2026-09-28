package com.serviceops.modules.admin.dto.response;

import com.serviceops.modules.admin.enums.BackupStatus;
import com.serviceops.modules.admin.enums.BackupTrigger;

import java.time.LocalDateTime;

/**
 * Ban sao luu (NCL-15-CN-003).
 *
 * @param sizeBytes  dung luong tep (TC-01).
 * @param restorable {@code true} khi ban sao da hoan tat — du dieu kien tao yeu cau phuc hoi. Tinh toan ven cua
 *                   tep (checksum) chi kiem tra luc tao yeu cau phuc hoi vi phai doc lai ca tep.
 */
public record BackupRecordRes(
		Long id,
		String code,
		BackupStatus status,
		BackupTrigger triggerType,
		String fileName,
		Long sizeBytes,
		String checksumSha256,
		Integer tableCount,
		Long rowCount,
		String note,
		String errorMessage,
		String createdBy,
		LocalDateTime startedAt,
		LocalDateTime completedAt,
		boolean restorable
) {}
