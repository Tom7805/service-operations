package com.serviceops.modules.report.dto.request;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.report.enums.ReportFormat;
import com.serviceops.modules.report.enums.ReportType;

import java.time.LocalDate;

/** Yêu cầu xuất báo cáo ra tệp (NCL-11-CN-004): loại báo cáo, kỳ gồm cả hai đầu và định dạng tệp. */
public record ReportExportReq(ReportType reportType, LocalDate from, LocalDate to, ReportFormat format) {

	/** Thiếu loại báo cáo hoặc kỳ sai thì {@code VALIDATION_ERROR}; thiếu định dạng thì mặc định CSV. */
	public ReportExportReq {
		if (reportType == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Loai bao cao khong duoc de trong");
		}
		ReportPeriodReq.requireValid(new ReportPeriodReq(from, to));
		if (format == null) {
			format = ReportFormat.CSV;
		}
	}
}
