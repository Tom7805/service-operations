package com.serviceops.modules.timesheet.dto.response;

import com.serviceops.modules.timesheet.enums.PeriodStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Ky cham cong tra ve cho FE (NCL-06-CN-006).
 *
 * @param id          ma ky.
 * @param periodStart ngay dau ky (ngay 1 cua thang).
 * @param periodEnd   ngay cuoi ky (ngay cuoi cung cua thang).
 * @param status      trang thai ky (OPEN/LOCKED).
 * @param lockedBy    nguoi khoa ky lan gan nhat; null neu ky dang mo.
 * @param lockedAt    thoi diem khoa ky lan gan nhat; null neu ky dang mo.
 */
public record TimesheetPeriodRes(
		Long id,
		LocalDate periodStart,
		LocalDate periodEnd,
		PeriodStatus status,
		String lockedBy,
		LocalDateTime lockedAt) {
}
