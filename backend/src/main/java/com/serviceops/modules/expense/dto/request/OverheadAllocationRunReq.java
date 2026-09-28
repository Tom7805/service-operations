package com.serviceops.modules.expense.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * NCL-08-CN-005: yeu cau phan bo chi phi chung cho ky {@code year}/{@code month}.
 *
 * <p>Ke toan chon ky theo thang (giong NCL-06-CN-006) thay vi tu nhap ngay dau/cuoi —
 * he thong tu suy ra khoang ngay cua ca thang de tinh ty trong gio cong.</p>
 */
public record OverheadAllocationRunReq(
		@NotNull(message = "Nam khong duoc de trong") Integer year,

		@NotNull(message = "Thang khong duoc de trong")
		@Min(value = 1, message = "Thang phai tu 1 den 12")
		@Max(value = 12, message = "Thang phai tu 1 den 12")
		Integer month,

		@NotNull(message = "Tong chi phi chung khong duoc de trong")
		@DecimalMin(value = "0.01", message = "Tong chi phi chung phai lon hon 0")
		BigDecimal totalAmount) {
}
