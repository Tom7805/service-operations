package com.serviceops.modules.profitability.service;

import com.serviceops.modules.profitability.dto.response.PlannedVsActualMarginRes;

/**
 * So sánh biên lợi nhuận dự kiến (lúc báo giá) với biên lợi nhuận thực tế của dự án (NCL-09-CN-006).
 */
public interface MarginComparisonService {

	/**
	 * NCL-09-CN-006-TC-01: so sánh biên dự kiến/thực tế của một dự án.
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException {@code RESOURCE_NOT_FOUND} khi
	 *         không tìm thấy dự án, hoặc dự án chưa gắn báo giá nào để so sánh (TC-02).
	 */
	PlannedVsActualMarginRes compare(Long projectId);
}
