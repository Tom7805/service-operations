package com.serviceops.modules.invoice.enums;

/**
 * Mốc nhắc thu nợ tự động của một hóa đơn (NCL-10-CN-006).
 */
public enum DunningStage {

	/** Còn 3 ngày là tới hạn thanh toán. */
	UPCOMING_3_DAYS,

	/** Đúng ngày hết hạn thanh toán. */
	DUE_TODAY,

	/**
	 * Đã quá hạn, nhắc lặp lại theo chu kỳ 7 ngày một lần ({@code daysOverdue} là bội số của 7).
	 * Nhiều dòng {@link com.serviceops.modules.invoice.entity.DunningLog} có thể cùng stage này
	 * cho một hóa đơn, phân biệt bằng {@code referenceDate} (mốc 7 ngày khác nhau).
	 */
	OVERDUE
}
