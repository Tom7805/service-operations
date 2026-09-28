package com.serviceops.modules.timesheet.dto.response;

import java.util.List;

/**
 * Ket qua duyet bang cham cong tra ve cho FE (NCL-06-CN-003).
 *
 * <p>TC-03: duyet van thanh cong khi gio cong da dung/vuot ngan sach — canh
 * bao duoc tra trong {@code overBudgetWarnings} (QTN-20, nguong 80%).</p>
 *
 * @param timesheet          bang cham cong sau khi duyet (co the van con phan
 *                           cua PM khac trong trang thai PENDING_APPROVAL — TC-02).
 * @param overBudgetWarnings canh bao tung cong viec vuot nguong 80% ngan sach.
 */
public record TimesheetApprovalRes(TimesheetRes timesheet, List<String> overBudgetWarnings) {
}
