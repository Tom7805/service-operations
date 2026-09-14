package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request sua ban ghi gio cong (NCL-06-CN-001).
 *
 * <p>Chi dung de ghi de so gio va ghi chu cua ban ghi DRAFT cua chinh minh;
 * ngay lam viec ({@code workDate}) va cong viec khong doi — muon doi ngay thi
 * xoa ban ghi cu va ghi ban ghi moi.</p>
 */
public record TimeEntryUpdateReq(
		@NotNull(message = "So gio cong khong duoc de trong")
		@DecimalMin(value = "0.01", message = "So gio cong phai lon hon 0")
		BigDecimal hours,

		@Size(max = 1000, message = "Ghi chu khong duoc vuot 1000 ky tu")
		String note) {
}
