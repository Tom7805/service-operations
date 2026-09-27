package com.serviceops.modules.admin.dto.response;

import com.serviceops.modules.admin.enums.RestoreStatus;

import java.time.LocalDateTime;

/** Ket qua phuc hoi (buoc 2, QTN-30): du lieu da ve dung thoi diem cua ban sao {@link #backupCode}. */
public record RestoreResultRes(
		Long requestId,
		Long backupId,
		String backupCode,
		RestoreStatus status,
		int tablesRestored,
		long rowsRestored,
		LocalDateTime restoredToPointInTime,
		LocalDateTime completedAt
) {}
