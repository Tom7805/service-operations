package com.serviceops.modules.timesheet.dto.response;

/**
 * Ket qua tu choi bang cham cong tra ve cho FE (NCL-06-CN-004).
 *
 * @param timesheet      bang cham cong sau khi tu choi (co the van con phan cua PM khac o trang
 *                       thai PENDING_APPROVAL neu bang co gio cong thuoc nhieu du an — TC theo
 *                       cung logic voi duyet tung phan NCL-06-CN-003-TC-02).
 * @param rejectedEntries so dong gio cong vua bi tu choi va quay ve DRAFT.
 */
public record TimesheetRejectRes(TimesheetRes timesheet, int rejectedEntries) {
}
