package com.serviceops.modules.rate.dto.response;

import com.serviceops.modules.timesheet.enums.WorkType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Don gia ap dung cho mot dong gio cong cu the (NCL-07-CN-005, NCL-07-CN-006).
 *
 * <p>Gom du lieu dong gio cong (de doi chieu) va ket qua tra cuu don gia —
 * ap dung dung quy tac QTN-16 (uu tien don gia rieng theo hop dong, khong co
 * thi roi ve don gia chung cong ty) tai dung ngay cong ({@code workDate}) cua
 * dong do, khong bi anh huong boi lan tang gia sau nay; roi nhan them he so
 * theo loai hinh cong viec ({@code workType}, NCL-07-CN-006) de ra
 * {@code appliedDailyRate} — muc don gia cuoi cung dung de tinh doanh thu cho
 * dong gio cong nay.</p>
 */
public record ResolvedRateRes(
		Long timeEntryId,
		Long taskId,
		Long projectId,
		Long contractId,
		String professionalRole,
		String level,
		LocalDate workDate,
		BigDecimal hours,
		WorkType workType,
		BigDecimal dailyRate,
		LocalDate effectiveFrom,
		boolean isContractSpecific,
		BigDecimal rateFactor,
		BigDecimal appliedDailyRate
) {
}
