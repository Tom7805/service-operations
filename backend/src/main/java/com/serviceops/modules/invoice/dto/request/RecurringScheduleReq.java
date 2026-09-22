package com.serviceops.modules.invoice.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * NCL-10-CN-005: khai bao/cap nhat dieu khoan lap hoa don dinh ky cho mot hop dong duy tri.
 */
public record RecurringScheduleReq(
		@NotNull(message = "Ngay lap hoa don trong thang khong duoc de trong")
		@Min(value = 1, message = "Ngay lap hoa don phai tu 1 den 28")
		@Max(value = 28, message = "Ngay lap hoa don phai tu 1 den 28")
		Integer billingDayOfMonth,

		@NotNull(message = "Gia tri hoa don khong duoc de trong")
		@DecimalMin(value = "0.01", message = "Gia tri hoa don phai lon hon 0")
		BigDecimal amount,

		String notes,

		/** Bat/tat dieu khoan; de trong khi tao moi = bat (true). */
		Boolean active) {
}
