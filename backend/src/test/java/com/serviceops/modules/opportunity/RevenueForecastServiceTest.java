package com.serviceops.modules.opportunity;

import com.serviceops.modules.opportunity.dto.request.ForecastQueryReq;
import com.serviceops.modules.opportunity.dto.response.RevenueForecastRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.impl.RevenueForecastServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevenueForecastServiceTest {

	@Mock
	private OpportunityRepository opportunityRepository;

	private RevenueForecastServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new RevenueForecastServiceImpl(opportunityRepository);
	}

	@Test
	void aggregatesExpectedRevenueByCloseMonthAndProbability() {
		when(opportunityRepository.findAll()).thenReturn(List.of(
				opportunity("ERP", "100000000", "40", LocalDate.of(2026, 9, 30), OpportunityStatus.OPEN),
				opportunity("CRM", "200000000", "70", LocalDate.of(2026, 9, 15), OpportunityStatus.OPEN),
				opportunity("Support", "50000000", "10", LocalDate.of(2026, 10, 10), OpportunityStatus.OPEN)));

		RevenueForecastRes result = service.forecast(new ForecastQueryReq(null, null));

		assertThat(result.totalExpectedRevenue()).isEqualByComparingTo("185000000");
		assertThat(result.months()).extracting(RevenueForecastRes.MonthlyRevenueForecast::month)
				.containsExactly(YearMonth.of(2026, 9), YearMonth.of(2026, 10));
		assertThat(result.months().get(0).expectedRevenue()).isEqualByComparingTo("180000000");
		assertThat(result.months().get(0).opportunityCount()).isEqualTo(2);
	}

	@Test
	void excludesLostAndUndatedOpportunities() {
		when(opportunityRepository.findAll()).thenReturn(List.of(
				opportunity("Won", "100000000", "100", LocalDate.of(2026, 9, 1), OpportunityStatus.CLOSED),
				opportunity("Lost", "200000000", "0", LocalDate.of(2026, 9, 2), OpportunityStatus.CLOSED),
				opportunity("Missing date", "300000000", "70", null, OpportunityStatus.OPEN)));

		RevenueForecastRes result = service.forecast(new ForecastQueryReq(null, null));

		assertThat(result.totalExpectedRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.months()).isEmpty();
	}

	@Test
	void filtersForecastByCloseMonthRange() {
		when(opportunityRepository.findAll()).thenReturn(List.of(
				opportunity("September", "100000000", "40", LocalDate.of(2026, 9, 30), OpportunityStatus.OPEN),
				opportunity("October", "200000000", "70", LocalDate.of(2026, 10, 15), OpportunityStatus.OPEN)));

		RevenueForecastRes result = service.forecast(new ForecastQueryReq(
				LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)));

		assertThat(result.totalExpectedRevenue()).isEqualByComparingTo("140000000");
		assertThat(result.months()).singleElement()
				.satisfies(month -> assertThat(month.month()).isEqualTo(YearMonth.of(2026, 10)));
	}

	private Opportunity opportunity(String name, String expectedValue, String probability, LocalDate closeDate,
			OpportunityStatus status) {
		Opportunity opportunity = new Opportunity();
		opportunity.setName(name);
		opportunity.setExpectedValue(new BigDecimal(expectedValue));
		opportunity.setProbability(new BigDecimal(probability));
		opportunity.setExpectedCloseDate(closeDate);
		opportunity.setStage(OpportunityStage.PROPOSAL);
		opportunity.setStatus(status);
		return opportunity;
	}
}
