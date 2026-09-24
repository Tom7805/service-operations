package com.serviceops.modules.report.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Báo cáo giờ công theo nhân sự (NCL-11-CN-006): lưới người × dự án trong kỳ, chỉ tính giờ công ĐÃ DUYỆT của các dự
 * án do người xem quản lý (QTN-01). {@code totalBillableHours}/{@code totalNonBillableHours} là tổng toàn báo cáo,
 * dùng cho dòng tổng của bảng.
 */
public record TimesheetByEmployeeRes(
		LocalDate from,
		LocalDate to,
		int employeeCount,
		int projectCount,
		BigDecimal totalBillableHours,
		BigDecimal totalNonBillableHours,
		BigDecimal totalHours,
		List<TimesheetEmployeeProjectRow> rows) {
}
