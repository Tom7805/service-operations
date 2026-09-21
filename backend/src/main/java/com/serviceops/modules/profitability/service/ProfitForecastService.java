package com.serviceops.modules.profitability.service;

import com.serviceops.modules.profitability.dto.response.ProfitForecastRes;

/**
 * Dự báo lợi nhuận tới khi kết thúc dự án (NCL-09-CN-007), dựa trên ngân sách giờ công còn lại hoặc,
 * khi đã vượt ngân sách, tốc độ tiêu hao thực tế ngoại suy theo tỷ lệ hoàn thành công việc.
 */
public interface ProfitForecastService {

	/**
	 * @throws com.serviceops.common.exception.BusinessRuleException {@code RESOURCE_NOT_FOUND} khi
	 *         không tìm thấy dự án hoặc hợp đồng của dự án; {@code INVALID_STATE} khi loại hợp đồng
	 *         chưa được hỗ trợ tính doanh thu ghi nhận tự động (kế thừa từ {@code RevenueRecognitionService}).
	 */
	ProfitForecastRes forecast(Long projectId);
}
