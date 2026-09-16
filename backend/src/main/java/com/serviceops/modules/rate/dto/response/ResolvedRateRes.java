package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Don gia ap dung cho mot dong gio cong cu the (NCL-07-CN-005).
 *
 * <p>Gom du lieu dong gio cong (de doi chieu) va ket qua tra cuu don gia —
 * ap dung dung quy tac QTN-16 (uu tien don gia rieng theo hop dong, khong co
 * thi roi ve don gia chung cong ty) tai dung ngay cong ({@code workDate}) cua
 * dong do, khong bi anh huong boi lan tang gia sau nay.</p>
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
		BigDecimal dailyRate,
		LocalDate effectiveFrom,
		boolean isContractSpecific
) {
}
