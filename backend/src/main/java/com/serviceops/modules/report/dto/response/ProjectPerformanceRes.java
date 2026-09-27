package com.serviceops.modules.report.dto.response;

import com.serviceops.common.masking.MaskSensitive;
import com.serviceops.common.masking.MaskingLevel;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.project.enums.ProjectStatus;

import java.math.BigDecimal;
import java.util.List;

/**
 * Hiệu quả của một dự án (NCL-11-CN-003): kế hoạch trong báo giá so với thực tế, theo ba cặp — giờ công, giá trị hợp
 * đồng với doanh thu ghi nhận, biên dự kiến với biên thực tế.
 *
 * <p>{@code planAvailable = false} khi hợp đồng của dự án chưa gắn báo giá (TC-02): mọi trường {@code planned*} và
 * các trường so sánh với kế hoạch là {@code null}, {@code warnings} nêu rõ thiếu dữ liệu kế hoạch. Phần trăm là số
 * phần trăm 2 chữ số ({@code 18.75} = 18,75%). Các cột giá vốn bị che với vai trò ngoài Nhân sự/Kế toán/Ban giám đốc
 * (QTN-02, NCL-01-CN-005-TC-01); biên theo phần trăm vẫn hiển thị.</p>
 */
public record ProjectPerformanceRes(
		Long projectId,
		String projectCode,
		String projectName,
		ProjectStatus status,
		Long customerId,
		Long contractId,
		String contractCode,
		ContractType contractType,

		boolean planAvailable,
		Long quoteId,
		Integer quoteVersion,

		BigDecimal plannedHours,
		BigDecimal actualHours,
		/** actualHours − plannedHours; dương là vượt kế hoạch. */
		BigDecimal hoursVariance,
		/** hoursVariance ÷ plannedHours × 100; null khi plannedHours = 0. */
		BigDecimal hoursVariancePercent,

		BigDecimal contractValue,
		BigDecimal recognizedRevenue,
		RecognitionMethod revenueRecognitionMethod,
		/** recognizedRevenue ÷ contractValue × 100; null khi contractValue = 0. */
		BigDecimal revenueToContractPercent,

		BigDecimal plannedRevenue,
		@MaskSensitive(MaskingLevel.COST) BigDecimal plannedCost,
		@MaskSensitive(MaskingLevel.COST) BigDecimal actualCost,
		BigDecimal plannedMarginPercent,
		BigDecimal actualMarginPercent,
		/** actualMarginPercent − plannedMarginPercent (điểm phần trăm); null nếu thiếu một trong hai vế. */
		BigDecimal marginGapPercentPoints,

		/** hoursVariance × chi phí nhân công bình quân thực tế mỗi giờ; âm là tiết kiệm được. */
		@MaskSensitive(MaskingLevel.COST) BigDecimal hoursVarianceCostImpact,
		/** −hoursVarianceCostImpact ÷ plannedRevenue × 100: số điểm biên mất đi (âm) hoặc có thêm vì chênh lệch giờ. */
		BigDecimal hoursVarianceMarginImpactPercentPoints,

		int missingPlannedCostItemCount,
		int missingActualCostEntryCount,
		int missingActualRevenueEntryCount,
		List<String> warnings) {
}
