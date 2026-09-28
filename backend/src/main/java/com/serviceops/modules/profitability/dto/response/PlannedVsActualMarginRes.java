package com.serviceops.modules.profitability.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * So sánh biên lợi nhuận dự kiến (lúc báo giá) với biên lợi nhuận thực tế (tính đến hiện tại) của một
 * dự án (NCL-09-CN-006).
 *
 * <p><b>Biên dự kiến</b>: từ báo giá mới nhất gắn với hợp đồng của dự án — doanh thu dự kiến là
 * {@code totalAmount} của báo giá; chi phí dự kiến ước tính bằng chi phí giờ công bình quân của các
 * nhân sự đang giữ cùng vai trò chuyên môn với từng dòng báo giá (báo giá lập trước khi giao việc cho
 * người cụ thể nên chưa thể biết chính xác ai sẽ làm).</p>
 *
 * <p><b>Biên thực tế</b>: từ mọi dòng giờ công ĐÃ DUYỆT của dự án tính đến hiện tại, cùng công thức với
 * {@code NCL-09-CN-005} (QTN-15/16/17, qua {@code EntryMarginCalculator}).</p>
 *
 * <p><b>Không che dữ liệu (QTN-02):</b> khác với {@code LaborCostLineRes} (che chi phí/giờ công theo
 * TỪNG nhân sự cụ thể), báo cáo này chỉ trả số liệu TỔNG HỢP cấp dự án — không định danh được lương của
 * một cá nhân nào — và người dùng chính là Quản lý dự án (VT-02, không nằm trong nhóm được xem giá vốn
 * theo QTN-02) nên không gắn {@code @MaskSensitive}, khớp tiền lệ {@code ProjectLaborCostRes#totalLaborCost}.</p>
 */
public record PlannedVsActualMarginRes(
		Long projectId,
		Long quoteId,
		Integer quoteVersion,

		BigDecimal plannedWorkDays,
		BigDecimal plannedRevenue,
		BigDecimal plannedCost,
		BigDecimal plannedMargin,
		BigDecimal plannedMarginPercent,

		BigDecimal actualHours,
		BigDecimal actualRevenue,
		BigDecimal actualCost,
		BigDecimal actualMargin,
		BigDecimal actualMarginPercent,

		/** actualMarginPercent - plannedMarginPercent (điểm phần trăm); null nếu thiếu 1 trong 2 vế để tính %. */
		BigDecimal marginGapPercentPoints,
		/** Giờ công thực tế trừ giờ công dự kiến quy đổi (plannedWorkDays × 8). */
		BigDecimal hoursVarianceVsPlanned,
		/** Diễn giải nguyên nhân chênh lệch theo giờ và theo chi phí, dễ đọc cho người dùng. */
		List<String> gapReasons,

		/** Số dòng báo giá không ước tính được chi phí dự kiến (chưa có nhân sự nào giữ vai trò đó). */
		int missingPlannedCostItemCount,
		int missingActualCostEntryCount,
		int missingActualRevenueEntryCount
) {
}
