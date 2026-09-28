package com.serviceops.modules.timesheet.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Trang thai phien dong ho bam gio cua nhan su hien tai. */
public record TimerRes(
		Long timerId,
		Long projectId,
		Long taskId,
		Long userId,
		LocalDateTime startedAt,
		BigDecimal elapsedHours,
		String note,
		Boolean billable) {
}
