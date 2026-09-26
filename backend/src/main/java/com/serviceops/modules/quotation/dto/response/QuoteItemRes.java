package com.serviceops.modules.quotation.dto.response;

import java.math.BigDecimal;

/**
 * @param priced {@code false} khi vai tro chua co don gia hieu luc — dong nay khong duoc
 *               cong vao tong bao gia (NCL-03-CN-003, TC-02).
 */
public record QuoteItemRes(
		String professionalRole,
		String level,
		BigDecimal workDays,
		BigDecimal unitRate,
		BigDecimal amount,
		boolean priced
) {}
