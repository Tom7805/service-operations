package com.serviceops.modules.report.dto.request;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;

import java.time.LocalDate;

/**
 * Tham số của báo cáo giờ công theo nhân sự (NCL-11-CN-006): khoảng ngày làm việc, gồm cả hai đầu.
 *
 * <p>Tách riêng khỏi {@link ReportPeriodReq} theo đúng quy ước các báo cáo khác trong module (mỗi báo cáo một DTO
 * tham số riêng), dù hình dạng hiện tại giống nhau.</p>
 */
public record TimesheetReportReq(LocalDate from, LocalDate to) {

	/** Kỳ phải có đủ hai đầu và {@code from} không sau {@code to}; sai thì {@code VALIDATION_ERROR}. */
	public static TimesheetReportReq requireValid(TimesheetReportReq period) {
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
