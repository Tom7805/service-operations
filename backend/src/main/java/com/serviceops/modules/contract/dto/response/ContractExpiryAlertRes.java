package com.serviceops.modules.contract.dto.response;

import java.time.LocalDate;

/**
 * Hop dong sap het hieu luc, dung nhac Ke toan gia han truoc han (NCL-04-CN-006).
 *
 * @param daysRemaining so ngay con lai tinh tu hom nay den {@code endDate} (0 = het han hom nay).
 */
public record ContractExpiryAlertRes(
		Long contractId,
		String contractCode,
		String name,
		Long customerId,
		LocalDate endDate,
		long daysRemaining
) {}
