package com.serviceops.modules.report.dto.request;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;

import java.time.LocalDate;

/** Kỳ báo cáo theo khoảng ngày, gồm cả hai đầu. */
public record ReportPeriodReq(LocalDate from, LocalDate to) {

	/** Kỳ phải có đủ hai đầu và {@code from} không sau {@code to}; sai thì {@code VALIDATION_ERROR}. */
	public static ReportPeriodReq requireValid(ReportPeriodReq period) {
		if (period == null || period.from() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngay bat dau ky bao cao khong duoc de trong");
		}
		if (period.to() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngay ket thuc ky bao cao khong duoc de trong");
		}
		if (period.from().isAfter(period.to())) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay bat dau khong duoc sau ngay ket thuc ky bao cao");
		}
		return period;
	}
}
