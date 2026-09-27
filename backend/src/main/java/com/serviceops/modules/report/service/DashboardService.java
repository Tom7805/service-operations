package com.serviceops.modules.report.service;

import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.DashboardSummaryRes;

public interface DashboardService {

	/** NCL-11-CN-001: các chỉ số vận hành của kỳ chọn; ghi nhật ký mỗi lượt xem thành công. */
	DashboardSummaryRes getSummary(ReportPeriodReq period);
}
