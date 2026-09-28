package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request dieu chinh mot dong gio cong da duyet bang but toan dao (NCL-06-CN-005).
 *
 * <p>He thong tu tinh dong dao ({@code -hours} cua dong goc) — nguoi goi chi can cung cap
 * so gio dung ({@code correctedHours}) va ly do ({@code reason}, bat buoc — TC-02).</p>
 *
 * @param correctedHours so gio cong dung sau khi sua (0.01 tro len).
 * @param reason         ly do dieu chinh (bat buoc).
 */
public record TimeEntryAdjustmentReq(
		@NotNull(message = "So gio cong dung khong duoc de trong")
		@DecimalMin(value = "0.01", message = "So gio cong dung phai lon hon 0")
		BigDecimal correctedHours,

		@NotBlank(message = "Ly do dieu chinh khong duoc de trong")
		@Size(max = 1000, message = "Ly do dieu chinh khong duoc vuot 1000 ky tu")
		String reason) {
}
