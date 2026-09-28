package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Một mốc hiệu lực trong lịch sử đơn giá của một cặp (vai trò, cấp bậc) — NCL-07-CN-007.
 *
 * @param id           mã dòng đơn giá (bảng {@code bill_rates}).
 * @param dailyRate    đơn giá theo ngày công tại mốc này.
 * @param effectiveFrom ngày bắt đầu hiệu lực của mốc này.
 * @param effectiveTo  ngày cuối cùng còn hiệu lực — {@code effectiveFrom} của mốc kế tiếp trừ 1
 *                     ngày; {@code null} nếu đây là mốc mới nhất, đang áp dụng (khớp {@code current}).
 * @param current      mốc này có đang là đơn giá hiệu lực hiện hành không (mốc mới nhất).
 * @param changedBy    tên đăng nhập người đã khai báo mốc này (từ {@code audit_logs} của lần tạo
 *                     — {@code NCL-07-CN-001}); {@code null} nếu dữ liệu tạo trước khi có audit log.
 * @param changedAt    thời điểm khai báo mốc này; {@code null} cùng điều kiện với {@code changedBy}.
 */
public record BillRateHistoryEntryRes(
		Long id,
		BigDecimal dailyRate,
		LocalDate effectiveFrom,
		LocalDate effectiveTo,
		boolean current,
		String changedBy,
		LocalDateTime changedAt) {
}
