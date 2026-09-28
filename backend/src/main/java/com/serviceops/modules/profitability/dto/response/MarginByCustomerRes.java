package com.serviceops.modules.profitability.dto.response;

import com.serviceops.common.masking.MaskSensitive;
import com.serviceops.common.masking.MaskingLevel;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Báo cáo biên lợi nhuận theo khách hàng trong một kỳ (NCL-09-CN-005, TC-01).
 *
 * <p>Mỗi dòng gộp doanh thu ghi nhận và giá vốn giờ công của mọi dự án thuộc cùng một khách hàng,
 * tính từ các dòng giờ công ĐÃ DUYỆT có ngày làm việc trong khoảng {@code periodFrom}..{@code periodTo}.</p>
 */
public record MarginByCustomerRes(
		LocalDate periodFrom,
		LocalDate periodTo,
		BigDecimal totalRevenue,
		@MaskSensitive(MaskingLevel.COST) BigDecimal totalCost,
		@MaskSensitive(MaskingLevel.COST) BigDecimal totalMargin,
		@MaskSensitive(MaskingLevel.COST) BigDecimal totalMarginPercent,
		List<CustomerMarginLineRes> lines,
		/** Số dòng giờ công đã duyệt bị loại khỏi giá vốn vì thiếu chi phí giờ công hiệu lực (QTN-17). */
		int missingCostEntryCount,
		/** Số dòng giờ công có tính phí bị loại khỏi doanh thu vì thiếu đơn giá bán hiệu lực (QTN-15/16). */
		int missingRevenueEntryCount
) {
}
