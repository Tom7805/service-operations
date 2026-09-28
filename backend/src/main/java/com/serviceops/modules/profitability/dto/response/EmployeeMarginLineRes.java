package com.serviceops.modules.profitability.dto.response;

import com.serviceops.common.masking.MaskSensitive;
import com.serviceops.common.masking.MaskingLevel;

import java.math.BigDecimal;

/** Một dòng biên lợi nhuận của một nhân sự trong kỳ báo cáo (NCL-09-CN-005, TC-02). */
public record EmployeeMarginLineRes(
		Long employeeId,
		String employeeName,
		String professionalRole,
		BigDecimal approvedHours,
		BigDecimal revenue,
		@MaskSensitive(MaskingLevel.COST) BigDecimal cost,
		@MaskSensitive(MaskingLevel.COST) BigDecimal margin,
		/** Biên lợi nhuận theo %, null khi doanh thu bằng 0 (không chia được). */
		@MaskSensitive(MaskingLevel.COST) BigDecimal marginPercent
) {
}
