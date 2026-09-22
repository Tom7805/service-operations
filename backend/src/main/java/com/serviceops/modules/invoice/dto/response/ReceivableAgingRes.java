package com.serviceops.modules.invoice.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Cong no qua han tai {@code asOfDate}, phan nhom theo so ngay qua han (NCL-10-CN-004).
 * Luon tra du bon nhom (nhom khong co hoa don thi {@code invoiceCount = 0} va {@code invoices} rong)
 * de man hinh khong phai tu dung lai nhom trong.
 *
 * @param totalInvoiceCount    so hoa don qua han (sau khi ap dung bo loc)
 * @param totalRemainingAmount tong so con phai thu cua cac hoa don do
 */
public record ReceivableAgingRes(
		LocalDate asOfDate,
		int totalInvoiceCount,
		BigDecimal totalRemainingAmount,
		List<BucketRes> buckets
) {

	/**
	 * @param bucket   ma nhom (DAYS_1_30, DAYS_31_60, DAYS_61_90, OVER_90)
	 * @param fromDays so ngay qua han thap nhat cua nhom (gom)
	 * @param toDays   so ngay qua han cao nhat cua nhom (gom); {@code null} = khong gioi han tren
	 */
	public record BucketRes(
			String bucket,
			String label,
			int fromDays,
			Integer toDays,
			int invoiceCount,
			BigDecimal remainingAmount,
			List<ItemRes> invoices
	) {
	}

	/**
	 * Mot hoa don qua han.
	 *
	 * @param daysOverdue so ngay tu han thanh toan toi {@code asOfDate}, luon {@code >= 1}
	 */
	public record ItemRes(
			Long id,
			String invoiceCode,
			Long contractId,
			String contractCode,
			Long customerId,
			String customerName,
			String status,
			BigDecimal totalAmount,
			BigDecimal paidAmount,
			BigDecimal remainingAmount,
			LocalDate invoiceDate,
			LocalDate dueDate,
			long daysOverdue
	) {
	}
}
