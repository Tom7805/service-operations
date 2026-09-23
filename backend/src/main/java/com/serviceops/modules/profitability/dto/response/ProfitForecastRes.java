package com.serviceops.modules.profitability.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Dự báo lợi nhuận của dự án tới khi kết thúc (NCL-09-CN-007), ngoại suy từ dữ liệu giờ công/chi
 * phí/doanh thu hiện hành — không lưu snapshot, cùng mô hình "tính động" với các báo cáo khác của
 * Epic 9.
 *
 * <p><b>Phần giờ còn lại ({@code remainingHours}):</b> khi dự án CHƯA vượt ngân sách giờ công
 * ({@code overBudget = false}), lấy đúng phần ngân sách chưa dùng ({@code budgetHours - actualHours},
 * TC-01). Khi ĐÃ vượt ngân sách (TC-02), ngân sách không còn là mốc tin cậy nên ước tính theo tốc độ
 * tiêu hao thực tế: ngoại suy {@code estimatedTotalHoursAtCompletion = actualHours / taskCompletionRate}
 * (tỷ lệ hoàn thành theo số công việc đã xong / tổng công việc), rồi {@code remainingHours} là phần
 * còn thiếu tới mốc đó.</p>
 *
 * <p><b>Doanh thu dự báo:</b> hợp đồng theo giờ (TIME_AND_MATERIAL) cộng thêm phần giờ còn lại nhân
 * đơn giá bán bình quân thực tế; hợp đồng trọn gói (FIXED_PRICE) là trọn giá trị hợp đồng vì doanh thu
 * ghi nhận theo tỷ lệ hoàn thành, không phụ thuộc số giờ.</p>
 *
 * <p><b>Không che dữ liệu (QTN-02):</b> chỉ trả số liệu tổng hợp cấp dự án (không định danh nhân sự
 * cụ thể), người dùng chính là Quản lý dự án (VT-02) — khớp tiền lệ {@code PlannedVsActualMarginRes}.</p>
 */
public record ProfitForecastRes(
		Long projectId,

		BigDecimal budgetHours,
		BigDecimal actualHours,
		BigDecimal remainingHours,
		/** true khi giờ công đã duyệt vượt ngân sách giờ công của dự án (TC-02). */
		boolean overBudget,
		/** Số công việc DONE / tổng số công việc; null nếu dự án chưa có công việc nào. */
		BigDecimal taskCompletionRate,
		/** Tổng giờ công ước tính khi dự án hoàn thành (actualHours + remainingHours). */
		BigDecimal estimatedTotalHoursAtCompletion,

		BigDecimal actualRevenue,
		BigDecimal actualCost,
		BigDecimal actualMargin,
		BigDecimal actualMarginPercent,

		BigDecimal forecastRevenue,
		BigDecimal forecastCost,
		BigDecimal forecastMargin,
		BigDecimal forecastMarginPercent,

		/** forecastMarginPercent - actualMarginPercent (điểm phần trăm); null nếu thiếu 1 trong 2 vế. */
		BigDecimal marginVariancePercentPoints,
		/** true khi biên lợi nhuận dự báo khi kết thúc dự án bị âm. */
		boolean riskOfLoss,
		/** Diễn giải cảnh báo (vượt ngân sách, nguy cơ lỗ, thiếu dữ liệu ngân sách...), dễ đọc cho người dùng. */
		List<String> warnings
) {
}
