package com.serviceops.modules.report.service;

import com.serviceops.modules.report.dto.response.TimesheetByEmployeeRes;

import java.time.LocalDate;

public interface TimesheetReportService {

	/**
	 * NCL-11-CN-006: lưới giờ công người × dự án trong kỳ {@code [from, to]}, chỉ tính các dự án do người đang đăng
	 * nhập quản lý (QTN-01) và các dòng giờ công ĐÃ DUYỆT; ghi nhật ký mỗi lượt xem (TC-03).
	 */
	TimesheetByEmployeeRes getReport(LocalDate from, LocalDate to);
}
