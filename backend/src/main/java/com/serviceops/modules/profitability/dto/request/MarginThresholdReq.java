package com.serviceops.modules.profitability.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Dat nguong bien loi nhuan toi thieu toan cong ty (NCL-09-CN-004). Ty le dang phan so
 * (0.15 = 15%), cung don vi voi {@code ProjectMarginRes.marginRate}.
 */
public record MarginThresholdReq(
		@NotNull(message = "Nguong bien loi nhuan toi thieu khong duoc de trong")
		@DecimalMin(value = "-1.0", message = "Nguong bien loi nhuan khong hop le")
		@DecimalMax(value = "1.0", message = "Nguong bien loi nhuan khong hop le")
		BigDecimal minMarginRate
) {
}
