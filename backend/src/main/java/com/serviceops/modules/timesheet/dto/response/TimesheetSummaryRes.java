package com.serviceops.modules.timesheet.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Tong hop gio cong mot cong viec trong mot tuan cham cong (NCL-06-CN-001).
 *
 * <p>Group cac ban ghi gio cong theo cong viec de FE dung luoi tuan: moi dong
 * la mot cong viec, cac ban ghi ben trong theo ngay. Kem thong tin ngan sach
 * gio cong de canh bao vuot ngan sach ngay tai cho (QTN-20: canh bao khi
 * {@code usageRatio >= 0.80}).</p>
 *
 * @param taskId            ma cong viec.
 * @param taskName          ten cong viec (denormalize cho FE hien thi).
 * @param weekFrom          ngay dau tuan cham cong (kem theo).
 * @param weekTo            ngay cuoi tuan cham cong (kem theo).
 * @param entries           cac ban ghi gio cong trong tuan.
 * @param totalHours        tong gio cong cua cong viec trong tuan.
 * @param budgetHours       ngan sach gio cong cua cong viec (null neu chua dat).
 * @param approvedHours     gio cong da duyet (tinh tu lan duyet, hien co the 0).
 * @param usageRatio        tong gio da ghi / ngan sach; null khi chua dat ngan sach.
 * @param overBudgetWarning canh bao khi usageRatio >= 0.80 (QTN-20).
 */
public record TimesheetSummaryRes(Long taskId, String taskName, LocalDate weekFrom, LocalDate weekTo,
		List<TimeEntryRes> entries, BigDecimal totalHours, BigDecimal budgetHours, BigDecimal approvedHours,
		BigDecimal usageRatio, boolean overBudgetWarning) {
}
