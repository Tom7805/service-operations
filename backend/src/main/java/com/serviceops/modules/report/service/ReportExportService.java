package com.serviceops.modules.report.service;

import com.serviceops.modules.report.dto.request.ReportExportReq;
import com.serviceops.modules.report.dto.response.ReportFileRes;

public interface ReportExportService {

	/**
	 * NCL-11-CN-004: dựng tệp báo cáo theo kỳ đã chọn (TC-01). Cột giá vốn bị bỏ hẳn khỏi tệp khi người xuất không
	 * được xem dữ liệu nhạy cảm (QTN-02, NCL-01-CN-005-TC-02). Mỗi lần xuất thành công ghi Nhật ký hệ thống và Nhật
	 * ký truy cập dữ liệu nhạy cảm loại EXPORT (TC-04, QTN-03).
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException {@code INVALID_STATE} khi kỳ không có dữ liệu
	 * để xuất (TC-02)
	 */
	ReportFileRes export(ReportExportReq request);
}
