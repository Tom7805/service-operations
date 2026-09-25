package com.serviceops.modules.admin.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * Mot nam tai chinh chia theo moc bat dau cua cong ty (NCL-15-CN-002-TC-01).
 *
 * <p>Quy uoc: nam tai chinh mang so cua nam duong lich chua ngay bat dau. VD bat dau thang 4 thi
 * nam tai chinh 2026 = 01/04/2026 - 31/03/2027, quy 1 = thang 4-6/2026.</p>
 */
public record FiscalPeriodRes(
		int fiscalYear,
		int startMonth,
		LocalDate startDate,
		LocalDate endDate,
		List<Quarter> quarters,
		List<Month> months
) {

	/** @param quarter quy tai chinh 1-4. */
	public record Quarter(int quarter, LocalDate startDate, LocalDate endDate) {}

	/**
	 * @param period    thang thu may trong nam tai chinh (1-12).
	 * @param yearMonth thang duong lich tuong ung, dang {@code yyyy-MM}.
	 */
	public record Month(int period, String yearMonth, LocalDate startDate, LocalDate endDate) {}
}
