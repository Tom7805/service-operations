package com.serviceops.modules.admin.dto.response;

import com.serviceops.modules.admin.enums.DuplicateAction;
import com.serviceops.modules.admin.enums.ImportErrorStage;
import com.serviceops.modules.admin.enums.ImportStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ket qua / lich su mot phien nhap (NCL-15-CN-004).
 *
 * @param errors cac dong loi de sua lai: {@code VALIDATION} (khong hop le, khong duoc nhap) va {@code COMMIT} (hop le
 *               nhung ghi that bai, VD ho so vua bi trung do nguoi khac tao). {@code null} o API danh sach.
 */
public record ImportResultRes(
		Long jobId,
		ImportTargetType targetType,
		String fileName,
		ImportStatus status,
		int totalRows,
		int validRows,
		int invalidRows,
		int duplicateRows,
		int createdCount,
		int updatedCount,
		int skippedCount,
		int failedCount,
		DuplicateAction duplicateAction,
		String createdBy,
		LocalDateTime createdAt,
		String committedBy,
		LocalDateTime committedAt,
		String notice,
		List<Error> errors
) {

	public record Error(int rowNumber, ImportErrorStage stage, String message, String rawData) {}
}
