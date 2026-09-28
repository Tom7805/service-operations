package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Du lieu bat dau dong ho bam gio. */
public record TimerStartReq(
		@NotBlank(message = "Ghi chu khong duoc de trong")
		@Size(max = 1000, message = "Ghi chu khong duoc vuot 1000 ky tu")
		String note,

		Boolean billable) {
}
