package com.serviceops.modules.timesheet.dto.response;

import java.time.LocalDateTime;

/**
 * Dau vet day du mot lan dieu chinh gio cong bang but toan dao (NCL-06-CN-005).
 *
 * <p>Ca ba dong (goc, dao, sua) deu tra ve de tra cuu — dong goc {@code originalEntry}
 * giu nguyen khong doi (QTN-11).</p>
 *
 * @param adjustmentId   ma ban ghi dieu chinh.
 * @param originalEntry  dong gio cong goc da duyet (khong doi).
 * @param reversalEntry  dong dao — so gio am dung bang dong goc.
 * @param correctedEntry dong ghi lai so gio dung.
 * @param reason         ly do dieu chinh.
 * @param adjustedBy     nguoi thuc hien dieu chinh (Quan ly du an).
 * @param adjustedAt     thoi diem dieu chinh.
 */
public record AdjustmentTraceRes(
		Long adjustmentId,
		TimeEntryRes originalEntry,
		TimeEntryRes reversalEntry,
		TimeEntryRes correctedEntry,
		String reason,
		String adjustedBy,
		LocalDateTime adjustedAt) {
}
