package com.serviceops.modules.quotation.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Mot phien ban bao gia cua co hoi (NCL-03-CN-003).
 *
 * @param latest       {@code true} voi phien ban moi nhat cua co hoi (TC-03: giu moi phien ban
 *                     va danh dau phien ban moi nhat).
 * @param missingRates cac vai tro chua co don gia hieu luc tai thoi diem lap (TC-02).
 */
public record QuoteRes(
		Long id,
		Long opportunityId,
		Integer version,
		boolean latest,
		BigDecimal totalAmount,
		List<QuoteItemRes> items,
		List<String> missingRates,
		String createdBy,
		LocalDateTime createdAt
) {}
