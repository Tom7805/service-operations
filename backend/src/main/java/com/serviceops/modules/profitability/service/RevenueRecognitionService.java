package com.serviceops.modules.profitability.service;

import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;

public interface RevenueRecognitionService {

	/**
	 * Tinh doanh thu ghi nhan cua du an (NCL-09-CN-002) theo dung loai hop dong:
	 * TIME_AND_MATERIAL tinh tu gio da duyet nhan don gia ap dung tung dong,
	 * FIXED_PRICE tinh theo ty le hoan thanh cong viec nhan gia tri hop dong.
	 */
	RecognizedRevenueRes calculateRecognizedRevenue(Long projectId);
}
