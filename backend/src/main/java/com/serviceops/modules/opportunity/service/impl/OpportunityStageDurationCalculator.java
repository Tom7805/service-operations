package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.entity.OpportunityStageHistory;
import com.serviceops.modules.opportunity.repository.OpportunityStageHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * So ngay mot co hoi da nam o giai doan hien tai — logic nay TRUOC DAY chi nam
 * rieng trong {@link SalesPipelineReportServiceImpl} (chi dung cho man Bao cao
 * duong ong), nen danh sach "Co hoi ban hang" khong co cach nao hien thi cho
 * nguoi dung biet mot co hoi da dung o giai doan bao lau / con bao nhieu ngay
 * la den nguong canh bao. Tach thanh mot thanh phan dung chung de ca hai noi
 * (bao cao va danh sach) cung hien MOT con so, tinh cung MOT cach.
 *
 * <p>Tinh tu ban ghi {@link OpportunityStageHistory} moi nhat co {@code toStage}
 * = giai doan hien tai; neu co hoi chua tung chuyen giai doan thi tinh tu
 * {@code createdAt}. Khong bao gio am (moc tuong lai duoc lam tron ve 0).</p>
 */
@Component
@RequiredArgsConstructor
public class OpportunityStageDurationCalculator {

	/** Nguong (ngay) coi mot co hoi con mo la "qua han xu ly" (NCL-03-CN-007, TC-02). */
	public static final int STALLED_THRESHOLD_DAYS = 60;

	private final OpportunityStageHistoryRepository stageHistoryRepository;

	/**
	 * Tinh so ngay o giai doan hien tai cho tung co hoi trong danh sach, mot
	 * truy van lich su duy nhat cho toan bo (tranh N+1 khi tinh tung ca).
	 */
	public Map<Long, Long> daysInCurrentStageByOpportunity(List<Opportunity> opportunities, LocalDateTime now) {
		Map<Long, List<OpportunityStageHistory>> historyByOpportunity = new HashMap<>();
		for (OpportunityStageHistory history : stageHistoryRepository.findAllByOrderByChangedAtDesc()) {
			historyByOpportunity
					.computeIfAbsent(history.getOpportunityId(), ignored -> new ArrayList<>())
					.add(history);
		}

		Map<Long, Long> result = new HashMap<>();
		for (Opportunity opportunity : opportunities) {
			result.put(opportunity.getId(), daysInCurrentStage(opportunity, historyByOpportunity, now));
		}
		return result;
	}

	private long daysInCurrentStage(Opportunity opportunity,
			Map<Long, List<OpportunityStageHistory>> historyByOpportunity, LocalDateTime now) {
		LocalDateTime enteredAt = opportunity.getCreatedAt();
		for (OpportunityStageHistory history : historyByOpportunity.getOrDefault(opportunity.getId(), List.of())) {
			if (history.getToStage() == opportunity.getStage()) {
				enteredAt = history.getChangedAt();
				break; // danh sach da sap xep moi nhat truoc.
			}
		}
		if (enteredAt == null) {
			return 0L;
		}
		long days = Duration.between(enteredAt, now).toDays();
		return Math.max(days, 0L);
	}
}
