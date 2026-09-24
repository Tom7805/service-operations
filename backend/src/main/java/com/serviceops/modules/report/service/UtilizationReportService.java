package com.serviceops.modules.report.service;

import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.UtilizationRes;

public interface UtilizationReportService {

	/** NCL-11-CN-002: tỷ lệ giờ tính phí theo từng người, từng bộ phận và toàn công ty; ghi nhật ký mỗi lượt xem. */
	UtilizationRes getReport(ReportPeriodReq period);
}
