package com.serviceops.modules.timesheet.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot lan dieu chinh gio cong trong danh sach "Lich su dieu chinh" cua PM (NCL-06-CN-005) — gom moi cong
 * viec cua cac du an PM quan ly, doc tu bang {@code timesheet_entry_adjustments} nen van tra lai duoc sau
 * khi dong goc da roi khoi danh sach "co the dieu chinh".
 *
 * @param originalHours  so gio cua dong goc (truoc dieu chinh).
 * @param correctedHours so gio cua dong sua (sau dieu chinh).
 */
public record AdjustmentHistoryRes(
		Long adjustmentId,
		Long projectId,
		String projectName,
		Long taskId,
		String taskName,
		Long userId,
		LocalDate workDate,
		BigDecimal originalHours,
		BigDecimal correctedHours,
		Long originalEntryId,
		Long reversalEntryId,
		Long correctedEntryId,
		String reason,
		String adjustedBy,
		LocalDateTime adjustedAt) {
}
