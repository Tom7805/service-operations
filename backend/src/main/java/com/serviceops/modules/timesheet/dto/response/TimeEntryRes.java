package com.serviceops.modules.timesheet.dto.response;

import com.serviceops.modules.timesheet.enums.TimeEntryStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot ban ghi gio cong tra ve cho FE (NCL-06-CN-001).
 *
 * @param id        ma ban ghi.
 * @param taskId    cong viec duoc ghi gio.
 * @param userId    nhan su ghi gio (luon la chinh minh voi API cua story nay).
 * @param workDate  ngay lam viec.
 * @param hours     so gio cong.
 * @param status    trang thai ban ghi (DRAFT/SUBMITTED/APPROVED/REJECTED).
 * @param note      ghi chu nguoi ghi.
 * @param createdAt thoi diem tao ban ghi.
 */
public record TimeEntryRes(Long id, Long taskId, Long userId, LocalDate workDate, BigDecimal hours,
		TimeEntryStatus status, String note, LocalDateTime createdAt) {
}
