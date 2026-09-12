package com.serviceops.modules.timesheet.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot bang cham cong trong hang cho duyet cua PM (NCL-06-CN-003).
 *
 * <p>PM chi thay cac bang co it nhat mot dong gio cong SUBMITTED thuoc du an
 * ma minh quan ly (TC-02). {@code pendingHours}/{@code pendingEntries} la phan
 * con cho duyet thuoc du an cua chinh PM nay.</p>
 *
 * @param timesheetId    ma bang cham cong tuan.
 * @param userId         nhan su nop bang.
 * @param weekStartDate  ngay dau tuan cham cong.
 * @param weekEndDate    ngay cuoi tuan cham cong.
 * @param totalHours     tong gio cong cua ca tuan (moi du an).
 * @param pendingEntries so dong con cho duyet thuoc du an cua PM.
 * @param pendingHours   tong gio con cho duyet thuoc du an cua PM.
 * @param submittedAt    thoi diem nhan su nop bang.
 */
public record PendingTimesheetRes(Long timesheetId, Long userId, LocalDate weekStartDate, LocalDate weekEndDate,
		BigDecimal totalHours, long pendingEntries, BigDecimal pendingHours, LocalDateTime submittedAt) {
}
