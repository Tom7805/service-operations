package com.serviceops.modules.profitability.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cau hinh nguong canh bao am bien hien hanh (NCL-09-CN-004). Cac truong deu {@code null}
 * khi Ban giam doc chua tung dat nguong nao.
 */
public record MarginAlertRes(
		BigDecimal minMarginRate,
		String updatedBy,
		LocalDateTime updatedAt
) {
}
