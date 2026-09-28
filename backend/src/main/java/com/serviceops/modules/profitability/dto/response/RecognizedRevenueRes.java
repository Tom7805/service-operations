package com.serviceops.modules.profitability.dto.response;

import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.profitability.enums.RecognitionMethod;

import java.math.BigDecimal;
import java.util.List;

/**
 * Doanh thu ghi nhan cua du an (NCL-09-CN-002), tinh dong theo dung loai hop dong —
 * khong luu snapshot, cung mo hinh voi {@code ProjectLaborCostRes} (NCL-09-CN-001).
 *
 * <p>Voi phuong thuc {@code HOURLY}: {@code totalBillableHours}, {@code missingRateEntryCount}
 * va {@code lines} co gia tri, {@code completionRate}/{@code totalTaskCount}/{@code doneTaskCount}
 * la {@code null}. Voi {@code PERCENTAGE_OF_COMPLETION} thi nguoc lai.</p>
 */
public record RecognizedRevenueRes(
		Long projectId,
		Long contractId,
		ContractType contractType,
		RecognitionMethod recognitionMethod,
		BigDecimal totalRecognizedRevenue,
		BigDecimal totalBillableHours,
		int excludedLineCount,
		int missingRateEntryCount,
		BigDecimal completionRate,
		Integer totalTaskCount,
		Integer doneTaskCount,
		List<RevenueLineRes> lines
) {
}
