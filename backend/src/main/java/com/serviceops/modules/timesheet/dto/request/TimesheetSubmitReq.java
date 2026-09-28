package com.serviceops.modules.timesheet.dto.request;

/**
 * Request nop bang cham cong tuan (NCL-06-CN-002).
 *
 * <p>Khoang tuan nhan tu path {@code POST /me/timesheets/{weekStartDate}/submit}
 * (dua theo quy uoc ngay dau tuan trong luoi gio cong {@code GET /me/time-entries});
 * body de trong — dia chi nguoi duyet duoc he thong xac dinh tu du an cua gio cong.</p>
 */
public record TimesheetSubmitReq() {
}
