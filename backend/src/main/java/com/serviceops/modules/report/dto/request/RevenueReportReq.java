package com.serviceops.modules.report.dto.request;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;

import java.time.YearMonth;

/** Kỳ báo cáo doanh thu theo tháng (NCL-11-CN-005), gồm cả tháng đầu và tháng cuối. */
public record RevenueReportReq(YearMonth fromMonth, YearMonth toMonth) {

	/** Tối đa 36 tháng mỗi lần xem để báo cáo không quét toàn bộ lịch sử giờ công. */
	public static final int MAX_MONTHS = 36;

	/** Thiếu tháng, tháng đầu sau tháng cuối hoặc quá {@link #MAX_MONTHS} tháng thì {@code VALIDATION_ERROR}. */
	public RevenueReportReq {
		if (fromMonth == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Thang bat dau khong duoc de trong");
		}
		if (toMonth == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Thang ket thuc khong duoc de trong");
		}
		if (fromMonth.isAfter(toMonth)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Thang bat dau khong duoc sau thang ket thuc");
		}
		if (monthCount(fromMonth, toMonth) > MAX_MONTHS) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ky bao cao toi da " + MAX_MONTHS + " thang");
		}
	}

	public int monthCount() {
		return monthCount(fromMonth, toMonth);
	}

	private static int monthCount(YearMonth from, YearMonth to) {
		return (int) (from.until(to, java.time.temporal.ChronoUnit.MONTHS) + 1);
	}
}
