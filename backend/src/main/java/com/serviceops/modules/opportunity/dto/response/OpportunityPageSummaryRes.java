package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;

/**
 * The thong ke cua man "Co hoi ban hang", tinh tren TOAN BO co hoi trong pham vi nguoi xem
 * (khong phu thuoc bo loc/trang): tong so, tong gia tri du kien, du bao co trong so
 * (gia tri x xac suat) va so co hoi da thang.
 */
public record OpportunityPageSummaryRes(long total, BigDecimal totalExpectedValue, BigDecimal weightedForecastValue,
		long wonCount) {
}
