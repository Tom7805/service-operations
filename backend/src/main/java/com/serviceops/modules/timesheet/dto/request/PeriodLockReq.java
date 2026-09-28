package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request khoa ky cham cong theo thang (NCL-06-CN-006).
 *
 * <p>Ke toan chon ky theo thang ({@code year}/{@code month}) chu khong nhap truc tiep
 * ngay dau/cuoi — he thong tu suy ra khoang ngay cua ca thang. Neu ky cho thang do chua
 * ton tai thi tao moi roi khoa luon.</p>
 */
public record PeriodLockReq(
		@NotNull(message = "Nam khong duoc de trong") Integer year,

		@NotNull(message = "Thang khong duoc de trong")
		@Min(value = 1, message = "Thang phai tu 1 den 12")
		@Max(value = 12, message = "Thang phai tu 1 den 12")
		Integer month) {
}
