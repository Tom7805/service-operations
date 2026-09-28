package com.serviceops.modules.report.dto.response;

import java.math.BigDecimal;

/**
 * Tỷ lệ giờ tính phí của một bộ phận, chỉ tính nhân sự trực tiếp thuộc bộ phận đó. Nhân sự chưa gán bộ phận gộp vào
 * một dòng có {@code departmentId = null}. {@code ratio} là phân số, {@code null} khi giờ chuẩn bằng 0.
 */
public record UtilizationByDepartmentRes(
		Long departmentId,
		String departmentName,
		int employeeCount,
		BigDecimal billableHours,
		BigDecimal standardHours,
		BigDecimal ratio) {
}
