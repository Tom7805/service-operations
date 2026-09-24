package com.serviceops.modules.report.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Báo cáo tỷ lệ giờ tính phí của một kỳ (NCL-11-CN-002) theo toàn công ty, từng bộ phận và từng người.
 * {@code unlistedBillableHours} là giờ tính phí đã duyệt của tài khoản không xuất hiện trong báo cáo (chưa có hồ sơ
 * nhân sự hoặc không làm việc ngày nào trong kỳ): {@code totalBillableHours + unlistedBillableHours} bằng mọi giờ
 * tính phí đã duyệt của kỳ.
 */
public record UtilizationRes(
		LocalDate from,
		LocalDate to,
		BigDecimal totalBillableHours,
		BigDecimal totalStandardHours,
		BigDecimal totalRatio,
		BigDecimal unlistedBillableHours,
		List<UtilizationByDepartmentRes> departments,
		List<UtilizationEmployeeRes> employees) {
}
