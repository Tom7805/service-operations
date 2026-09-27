package com.serviceops.modules.report.dto.response;

import java.math.BigDecimal;

/**
 * Một ô của lưới người × dự án trong báo cáo giờ công theo nhân sự (NCL-11-CN-006): tổng giờ ĐÃ DUYỆT của một nhân
 * sự trên một dự án trong kỳ báo cáo, tách theo có tính phí / không tính phí ({@link
 * com.serviceops.modules.timesheet.entity.TimeEntry#getBillable()}).
 */
public record TimesheetEmployeeProjectRow(
		Long employeeId,
		String employeeName,
		Long projectId,
		String projectCode,
		String projectName,
		BigDecimal billableHours,
		BigDecimal nonBillableHours,
		BigDecimal totalHours) {
}
