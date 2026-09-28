package com.serviceops.modules.profitability.dto.response;

import com.serviceops.common.masking.MaskSensitive;
import com.serviceops.common.masking.MaskingLevel;

import java.math.BigDecimal;

/** Một dòng biên lợi nhuận của một khách hàng trong kỳ báo cáo (NCL-09-CN-005, TC-01). */
public record CustomerMarginLineRes(
		Long customerId,
		String customerCode,
		String customerName,
		BigDecimal approvedHours,
		BigDecimal revenue,
		@MaskSensitive(MaskingLevel.COST) BigDecimal cost,
		@MaskSensitive(MaskingLevel.COST) BigDecimal margin,
		/** Biên lợi nhuận theo %, null khi doanh thu bằng 0 (không chia được). */
		@MaskSensitive(MaskingLevel.COST) BigDecimal marginPercent
) {
}
