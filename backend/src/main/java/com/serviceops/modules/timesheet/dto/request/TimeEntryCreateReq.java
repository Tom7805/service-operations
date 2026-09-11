package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request ghi gio cong cho mot cong viec (NCL-06-CN-001).
 *
 * <p>{@code taskId} khong nam trong body — nhan tu path
 * {@code POST /projects/{projectId}/tasks/{taskId}/time-entries} de dam bao
 * cong viec luoc thuoc du an trong path.</p>
 */
public record TimeEntryCreateReq(
		@NotNull(message = "Ngay lam viec khong duoc de trong")
		@PastOrPresent(message = "Ngay lam viec khong duoc o tuong lai")
		LocalDate workDate,

		@NotNull(message = "So gio cong khong duoc de trong")
		@DecimalMin(value = "0.01", message = "So gio cong phai lon hon 0")
		BigDecimal hours,

		@Size(max = 1000, message = "Ghi chu khong duoc vuot 1000 ky tu")
		String note) {
}
