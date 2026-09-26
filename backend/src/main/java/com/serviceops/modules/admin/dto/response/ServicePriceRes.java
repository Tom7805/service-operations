package com.serviceops.modules.admin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot moc gia cua dich vu.
 *
 * @param effectiveTo ngay cuoi cung moc nay con hieu luc (ngay truoc moc ke tiep); {@code null} = chua co moc sau.
 * @param current     {@code true} neu day la moc dang ap dung tai ngay tra cuu.
 */
public record ServicePriceRes(
		Long id,
		BigDecimal price,
		LocalDate effectiveFrom,
		LocalDate effectiveTo,
		boolean current,
		String note,
		String createdBy,
		LocalDateTime createdAt
) {}
