package com.serviceops.modules.rate.dto.request;

import com.serviceops.modules.timesheet.enums.WorkType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Khai bao/cap nhat he so nhan don gia cho mot loai hinh cong viec (NCL-07-CN-006).
 */
public record WorkTypeRateFactorReq(
		@NotNull(message = "Loai hinh cong viec khong duoc de trong")
		WorkType workType,

		@NotNull(message = "He so khong duoc de trong")
		@DecimalMin(value = "0.00", inclusive = false, message = "He so phai lon hon 0")
		BigDecimal factor
) {
}
