package com.serviceops.modules.timesheet.dto.response;

import com.serviceops.modules.timesheet.enums.TimesheetStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Thong tin bang cham cong tuan tra ve cho client sau khi tao/nop/duyet/tu choi. */
public record TimesheetRes(
		Long id,
		Long userId,
		LocalDate weekStartDate,
		LocalDate weekEndDate,
		TimesheetStatus status,
		BigDecimal totalHours,
		Long submittedBy,
		LocalDateTime submittedAt,
		Long approvedBy,
		LocalDateTime approvedAt,
		Long rejectedBy,
		LocalDateTime rejectedAt,
		String rejectReason) {
}
