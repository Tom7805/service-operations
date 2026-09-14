package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Bao cao duong ong ban hang theo giai doan (NCL-03-CN-007).
 *
 * <p>Ban giam doc (VT-01) / Nhan vien kinh doanh (VT-04) mo bao cao nay de biet
 * duong ong co "du day" hay khong: so luong va gia tri co hoi o tung giai doan
 * (TC-01), kem canh bao cac co hoi "dong lau bat thuong" (TC-02).</p>
 *
 * @param totalOpportunityCount   tong so co hoi duoc dua vao bao cao (moi trang thai).
 * @param totalExpectedValue      tong gia tri du kien cua tat ca co hoi trong bao cao.
 * @param stalledThresholdDays    nguong (ngay) de coi mot co hoi con mo la dong lau bat thuong (TC-02) — hien la 60.
 * @param generatedAt             thoi diem may chu sinh bao cao (moc tinh so ngay o giai doan).
 * @param stages                  cac dong theo giai doan, theo dung thu tu enum {@code OpportunityStage}.
 */
public record PipelineReportRes(
		long totalOpportunityCount,
		BigDecimal totalExpectedValue,
		int stalledThresholdDays,
		LocalDateTime generatedAt,
		List<PipelineStageRes> stages
) {}
