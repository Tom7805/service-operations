package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.modules.opportunity.dto.response.PipelineReportRes;
import com.serviceops.modules.opportunity.dto.response.PipelineStageRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.entity.OpportunityStageHistory;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.repository.OpportunityStageHistoryRepository;
import com.serviceops.modules.opportunity.service.SalesPipelineReportService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * NCL-03-CN-007: Bao cao duong ong ban hang theo giai doan.
 *
 * <p><b>TC-01</b> — voi moi giai doan cua {@link OpportunityStage} (ke ca giai doan
 * khong co co hoi, tra ve so 0), bao cao hien: so co hoi, tong gia tri du kien va
 * so ngay trung binh moi co hoi da nam o giai doan do. So ngay "nam o giai doan"
 * tinh tu thoi diem co hoi <i>chuyen vao</i> giai doan hien tai (ban ghi
 * {@link OpportunityStageHistory} moi nhat co {@code toStage} = giai doan hien tai);
 * neu co hoi chua tung chuyen giai doan thi tinh tu {@code createdAt}.</p>
 *
 * <p><b>TC-02</b> — co hoi con mo ({@code status = OPEN}) o mot giai doan trung gian
 * ({@code APPROACH}/{@code PROPOSAL}/{@code NEGOTIATION}) da nam qua
 * {@link #STALLED_THRESHOLD_DAYS} ngay duoc danh dau "dong lau bat thuong":
 * {@code stalledCount} tang len va id cua no nam trong {@code stalledOpportunityIds}
 * de giao dien mo tang chi tiet. Giai doan ket thuc ({@code WON}/{@code LOST}) khong
 * bao gio bi danh dau dong lau.</p>
 *
 * <p><b>TC-03</b> — phan quyen (chi VT-01 / VT-04) va ghi nhat ky lan tu choi do
 * {@code @PreAuthorize} tren controller + {@code OpportunityAccessDeniedAspect}
 * dam nhiem, khong xu ly o tang service nay.</p>
 *
 * <p><b>TC-04</b> — moi lan sinh bao cao ghi mot dong {@code REPORT_VIEW} vao nhat
 * ky co hoi ({@code opportunity_audit_logs}) qua {@link OpportunityAuditLogger}:
 * nguoi thuc hien, noi dung tom tat va thoi diem. Vi phuong thuc ghi du lieu nen
 * transaction o day la doc-ghi (khong {@code readOnly}).</p>
 */
@Service
public class SalesPipelineReportServiceImpl implements SalesPipelineReportService {

	/** Nguong (ngay) coi mot co hoi con mo la "dong lau bat thuong" (NCL-03-CN-007, TC-02). */
	static final int STALLED_THRESHOLD_DAYS = 60;

	private final OpportunityRepository opportunityRepository;
	private final OpportunityStageHistoryRepository stageHistoryRepository;
	private final OpportunityAuditLogger auditLogger;

	public SalesPipelineReportServiceImpl(OpportunityRepository opportunityRepository,
			OpportunityStageHistoryRepository stageHistoryRepository,
			OpportunityAuditLogger auditLogger) {
		this.opportunityRepository = opportunityRepository;
		this.stageHistoryRepository = stageHistoryRepository;
		this.auditLogger = auditLogger;
	}

	@Override
	@Transactional
	public PipelineReportRes generate() {
		final LocalDateTime now = LocalDateTime.now();
		final List<Opportunity> opportunities = opportunityRepository.findAll();

		// Mot truy van lay toan bo lich su (moi nhat truoc), gom theo co hoi trong bo nho
		// de tranh N+1 khi tinh moc "chuyen vao giai doan hien tai" cho tung co hoi.
		final Map<Long, List<OpportunityStageHistory>> historyByOpportunity = new java.util.HashMap<>();
		for (OpportunityStageHistory history : stageHistoryRepository.findAllByOrderByChangedAtDesc()) {
			historyByOpportunity
					.computeIfAbsent(history.getOpportunityId(), ignored -> new ArrayList<>())
					.add(history);
		}

		final Map<OpportunityStage, StageAccumulator> byStage = new EnumMap<>(OpportunityStage.class);
		for (OpportunityStage stage : OpportunityStage.values()) {
			byStage.put(stage, new StageAccumulator());
		}

		BigDecimal grandTotalValue = BigDecimal.ZERO;
		for (Opportunity opportunity : opportunities) {
			OpportunityStage stage = opportunity.getStage();
			StageAccumulator accumulator = byStage.get(stage);

			BigDecimal expectedValue = opportunity.getExpectedValue() == null
					? BigDecimal.ZERO : opportunity.getExpectedValue();
			long daysInStage = daysInCurrentStage(opportunity, historyByOpportunity, now);

			accumulator.count++;
			accumulator.totalValue = accumulator.totalValue.add(expectedValue);
			accumulator.totalDaysInStage += daysInStage;
			grandTotalValue = grandTotalValue.add(expectedValue);

			if (isStalled(opportunity, daysInStage)) {
				accumulator.stalledOpportunityIds.add(opportunity.getId());
			}
		}

		final List<PipelineStageRes> stageRows = new ArrayList<>();
		for (OpportunityStage stage : OpportunityStage.values()) {
			StageAccumulator accumulator = byStage.get(stage);
			long averageDays = accumulator.count == 0
					? 0L
					: Math.round((double) accumulator.totalDaysInStage / accumulator.count);
			stageRows.add(new PipelineStageRes(
					stage.name(),
					accumulator.count,
					accumulator.totalValue,
					averageDays,
					accumulator.stalledOpportunityIds.size(),
					List.copyOf(accumulator.stalledOpportunityIds)));
		}

		long totalStalled = stageRows.stream().mapToLong(PipelineStageRes::stalledCount).sum();
		auditLogger.recordReportView("Xem bao cao duong ong ban hang: " + opportunities.size()
				+ " co hoi, " + totalStalled + " co hoi dong lau bat thuong (nguong "
				+ STALLED_THRESHOLD_DAYS + " ngay)");

		return new PipelineReportRes(opportunities.size(), grandTotalValue, STALLED_THRESHOLD_DAYS, now, stageRows);
	}

	/**
	 * So ngay co hoi da nam o giai doan hien tai: tu ban ghi lich su moi nhat co
	 * {@code toStage} = giai doan hien tai, hoac tu {@code createdAt} neu chua tung
	 * chuyen giai doan. Khong bao gio am (moc tuong lai duoc lam tron ve 0).
	 */
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

	/** Co hoi con mo o giai doan trung gian, da nam qua nguong (TC-02). */
	private boolean isStalled(Opportunity opportunity, long daysInStage) {
		if (opportunity.getStatus() != OpportunityStatus.OPEN) {
			return false;
		}
		OpportunityStage stage = opportunity.getStage();
		boolean intermediateStage = stage == OpportunityStage.APPROACH
				|| stage == OpportunityStage.PROPOSAL
				|| stage == OpportunityStage.NEGOTIATION;
		return intermediateStage && daysInStage > STALLED_THRESHOLD_DAYS;
	}

	private static final class StageAccumulator {
		private long count;
		private BigDecimal totalValue = BigDecimal.ZERO;
		private long totalDaysInStage;
		private final List<Long> stalledOpportunityIds = new ArrayList<>();
	}
}
