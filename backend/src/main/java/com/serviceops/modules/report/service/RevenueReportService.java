package com.serviceops.modules.report.service;

import com.serviceops.modules.report.dto.request.RevenueReportReq;
import com.serviceops.modules.report.dto.response.MonthlyRevenueReportRes;

public interface RevenueReportService {

	/**
	 * NCL-11-CN-005: doanh thu ghi nhận từng tháng trong kỳ, tách theo loại hợp đồng và so với cùng kỳ năm trước.
	 * Ghi Nhật ký hệ thống mỗi lượt xem (TC-04).
	 */
	MonthlyRevenueReportRes getMonthlyRevenue(RevenueReportReq request);
}
