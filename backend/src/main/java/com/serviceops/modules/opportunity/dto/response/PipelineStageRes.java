package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Mot dong cua bao cao duong ong ban hang theo giai doan (NCL-03-CN-007, TC-01/02).
 *
 * <p>Moi giai doan cua {@link com.serviceops.modules.opportunity.enums.OpportunityStage}
 * co dung mot dong, ke ca khi khong co co hoi nao (cac so ve 0) — de giao dien ve du
 * pheu (funnel) ma khong phai suy ra giai doan trong.</p>
 *
 * @param stage                  ten giai doan ({@code APPROACH}/{@code PROPOSAL}/{@code NEGOTIATION}/{@code WON}/{@code LOST}).
 * @param opportunityCount        so co hoi dang o giai doan nay (TC-01).
 * @param totalExpectedValue      tong gia tri du kien ({@code expectedValue}) cua cac co hoi trong giai doan (TC-01).
 * @param averageDaysInStage      so ngay trung binh moi co hoi da nam o giai doan nay, lam tron; 0 khi khong co co hoi (TC-01).
 * @param stalledCount            so co hoi con mo dang "dong lau bat thuong" (qua {@code stalledThresholdDays}) trong giai doan (TC-02).
 * @param stalledOpportunityIds   danh sach id cac co hoi bi danh dau dong lau, de giao dien mo tang chi tiet (TC-02).
 */
public record PipelineStageRes(
		String stage,
		long opportunityCount,
		BigDecimal totalExpectedValue,
		long averageDaysInStage,
		long stalledCount,
		List<Long> stalledOpportunityIds
) {}
