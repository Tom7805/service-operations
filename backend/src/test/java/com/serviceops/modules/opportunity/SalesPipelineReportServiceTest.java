package com.serviceops.modules.opportunity;

import com.serviceops.modules.opportunity.dto.response.PipelineReportRes;
import com.serviceops.modules.opportunity.dto.response.PipelineStageRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.entity.OpportunityStageHistory;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.repository.OpportunityStageHistoryRepository;
import com.serviceops.modules.opportunity.service.impl.SalesPipelineReportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test SalesPipelineReportServiceImpl — NCL-03-CN-007.
 *
 * <ul>
 *   <li>TC-01: so luong + tong gia tri + so ngay trung binh theo tung giai doan,
 *       giai doan trong tra ve 0.</li>
 *   <li>TC-02: co hoi con mo o giai doan trung gian qua 60 ngay bi danh dau
 *       "dong lau bat thuong"; co hoi moi / da dong thi khong.</li>
 *   <li>TC-04: moi lan sinh bao cao ghi mot dong nhat ky co hoi.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class SalesPipelineReportServiceTest {

	@Mock
	private OpportunityRepository opportunityRepository;

	@Mock
	private OpportunityStageHistoryRepository stageHistoryRepository;

	@Mock
	private OpportunityAuditLogger auditLogger;

	private SalesPipelineReportServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new SalesPipelineReportServiceImpl(opportunityRepository, stageHistoryRepository, auditLogger);
		when(stageHistoryRepository.findAllByOrderByChangedAtDesc()).thenReturn(List.of());
	}

	@Test
	@DisplayName("TC-01: dem so luong, cong gia tri va so ngay trung binh theo tung giai doan")
	void aggregatesCountValueAndDwellByStage() {
		LocalDateTime now = LocalDateTime.now();
		when(opportunityRepository.findAll()).thenReturn(List.of(
				opp(1L, OpportunityStage.APPROACH, OpportunityStatus.OPEN, "100000000", now.minusDays(10)),
				opp(2L, OpportunityStage.APPROACH, OpportunityStatus.OPEN, "50000000", now.minusDays(20)),
				opp(3L, OpportunityStage.PROPOSAL, OpportunityStatus.OPEN, "200000000", now.minusDays(6)),
				opp(4L, OpportunityStage.NEGOTIATION, OpportunityStatus.OPEN, "300000000", now.minusDays(4)),
				opp(5L, OpportunityStage.WON, OpportunityStatus.CLOSED, "500000000", now.minusDays(2))));

		PipelineReportRes report = service.generate();

		assertThat(report.totalOpportunityCount()).isEqualTo(5);
		assertThat(report.totalExpectedValue()).isEqualByComparingTo("1150000000");
		assertThat(report.stalledThresholdDays()).isEqualTo(60);
		assertThat(report.stages()).extracting(PipelineStageRes::stage)
				.containsExactly("APPROACH", "PROPOSAL", "NEGOTIATION", "WON", "LOST");

		Map<String, PipelineStageRes> byStage = report.stages().stream()
				.collect(Collectors.toMap(PipelineStageRes::stage, Function.identity()));
		assertThat(byStage.get("APPROACH").opportunityCount()).isEqualTo(2);
		assertThat(byStage.get("APPROACH").totalExpectedValue()).isEqualByComparingTo("150000000");
		assertThat(byStage.get("APPROACH").averageDaysInStage()).isEqualTo(15); // (10 + 20) / 2
		assertThat(byStage.get("NEGOTIATION").opportunityCount()).isEqualTo(1);
		assertThat(byStage.get("LOST").opportunityCount()).isEqualTo(0);
		assertThat(byStage.get("LOST").totalExpectedValue()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(byStage.get("LOST").averageDaysInStage()).isEqualTo(0);
	}

	@Test
	@DisplayName("TC-02: co hoi con mo qua 60 ngay o giai doan trung gian bi danh dau dong lau")
	void flagsStalledOpportunitiesBeyondThreshold() {
		LocalDateTime now = LocalDateTime.now();
		when(opportunityRepository.findAll()).thenReturn(List.of(
				opp(10L, OpportunityStage.NEGOTIATION, OpportunityStatus.OPEN, "100000000", now.minusDays(75)),
				opp(11L, OpportunityStage.NEGOTIATION, OpportunityStatus.OPEN, "100000000", now.minusDays(30)),
				opp(12L, OpportunityStage.WON, OpportunityStatus.CLOSED, "100000000", now.minusDays(400))));

		PipelineReportRes report = service.generate();

		Map<String, PipelineStageRes> byStage = report.stages().stream()
				.collect(Collectors.toMap(PipelineStageRes::stage, Function.identity()));
		assertThat(byStage.get("NEGOTIATION").stalledCount()).isEqualTo(1);
		assertThat(byStage.get("NEGOTIATION").stalledOpportunityIds()).containsExactly(10L);
		// Co hoi da dong khong bao gio bi danh dau dong lau, du qua nguong.
		assertThat(byStage.get("WON").stalledCount()).isEqualTo(0);
	}

	@Test
	@DisplayName("TC-01: so ngay o giai doan tinh tu lan chuyen vao giai doan hien tai, khong phai createdAt")
	void dwellCountedFromLatestEntryIntoCurrentStage() {
		LocalDateTime now = LocalDateTime.now();
		Opportunity opportunity = opp(20L, OpportunityStage.NEGOTIATION, OpportunityStatus.OPEN, "100000000",
				now.minusDays(90));
		when(opportunityRepository.findAll()).thenReturn(List.of(opportunity));
		OpportunityStageHistory intoNegotiation = history(20L, OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION,
				now.minusDays(5));
		OpportunityStageHistory intoProposal = history(20L, OpportunityStage.APPROACH, OpportunityStage.PROPOSAL,
				now.minusDays(40));
		when(stageHistoryRepository.findAllByOrderByChangedAtDesc())
				.thenReturn(List.of(intoNegotiation, intoProposal));

		PipelineReportRes report = service.generate();

		PipelineStageRes negotiation = report.stages().stream()
				.filter(row -> row.stage().equals("NEGOTIATION")).findFirst().orElseThrow();
		assertThat(negotiation.averageDaysInStage()).isEqualTo(5);
		assertThat(negotiation.stalledCount()).isEqualTo(0); // 5 ngay < 60, khong dong lau
	}

	@Test
	@DisplayName("TC-04: moi lan sinh bao cao ghi mot dong nhat ky co hoi")
	void writesAuditLogOnEachReport() {
		when(opportunityRepository.findAll()).thenReturn(List.of());

		service.generate();

		verify(auditLogger).recordReportView(contains("bao cao duong ong ban hang"));
	}

	private Opportunity opp(long id, OpportunityStage stage, OpportunityStatus status, String value,
			LocalDateTime createdAt) {
		Opportunity opportunity = new Opportunity();
		opportunity.setId(id);
		opportunity.setName("Co hoi " + id);
		opportunity.setStage(stage);
		opportunity.setStatus(status);
		opportunity.setExpectedValue(new BigDecimal(value));
		opportunity.setCreatedAt(createdAt);
		return opportunity;
	}

	private OpportunityStageHistory history(long opportunityId, OpportunityStage from, OpportunityStage to,
			LocalDateTime changedAt) {
		OpportunityStageHistory h = new OpportunityStageHistory();
		h.setOpportunityId(opportunityId);
		h.setFromStage(from);
		h.setToStage(to);
		h.setChangedAt(changedAt);
		return h;
	}
}
