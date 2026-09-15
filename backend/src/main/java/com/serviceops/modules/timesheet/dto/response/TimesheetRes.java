package com.serviceops.modules.timesheet.dto.response;

import com.serviceops.modules.timesheet.enums.TimesheetStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Bang cham cong tuan tra ve cho FE sau khi nop (NCL-06-CN-002).
 *
 * @param id             ma bang cham cong.
 * @param userId         nhan su nop bang.
 * @param weekStartDate  ngay dau tuan cham cong.
 * @param weekEndDate    ngay cuoi tuan cham cong.
 * @param status         trang thai bang (PENDING_APPROVAL/APPROVED/REJECTED).
 * @param totalHours     tong gio cong cua tuan tai thoi diem nop.
 * @param submittedBy    ten tai khoan nguoi nop.
 * @param submittedAt    thoi diem nop.
 */
public record TimesheetRes(Long id, Long userId, LocalDate weekStartDate, LocalDate weekEndDate,
		TimesheetStatus status, BigDecimal totalHours, String submittedBy, LocalDateTime submittedAt) {
}
