package com.serviceops.modules.report.dto.response;

import java.math.BigDecimal;

/**
 * Tỷ lệ giờ tính phí của một nhân sự trong kỳ. {@code ratio} là phân số (0.7500 = 75%) và là {@code null} khi
 * giờ chuẩn của kỳ bằng 0 nhưng vẫn có giờ tính phí (thường do nhập sai ngày vào/nghỉ việc).
 */
public record UtilizationEmployeeRes(
		Long employeeId,
		Long userId,
		String fullName,
		String professionalRole,
		Long departmentId,
		String departmentName,
		BigDecimal billableHours,
		BigDecimal standardHours,
		BigDecimal ratio) {
}
