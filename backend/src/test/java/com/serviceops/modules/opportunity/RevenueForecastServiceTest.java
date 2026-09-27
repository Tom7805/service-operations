package com.serviceops.modules.opportunity;

import com.serviceops.modules.opportunity.dto.request.ForecastQueryReq;
import com.serviceops.modules.opportunity.dto.response.RevenueForecastRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.impl.RevenueForecastServiceImpl;
import com.serviceops.modules.opportunity.service.impl.OpportunityScopeGuard;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.UserScope;
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

	@Mock
	private CustomerRepository customerRepository;

	@Mock
	private OpportunityAuditLogger auditLogger;

	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;

	@Mock
	private UserRepository userRepository;

	private RevenueForecastServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new RevenueForecastServiceImpl(opportunityRepository, customerRepository,
				new OpportunityScopeGuard(currentUserScopeProvider, userRepository), auditLogger);
		org.mockito.Mockito.lenient().when(currentUserScopeProvider.currentScope()).thenReturn(UserScope.company());
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
	void treatsNullProbabilityAsZeroButStillCountsOpportunity() {
		Opportunity opportunity = new Opportunity();
		opportunity.setName("Chua danh gia xac suat");
		opportunity.setExpectedValue(new BigDecimal("100000000"));
		opportunity.setProbability(null);
		opportunity.setExpectedCloseDate(LocalDate.of(2026, 9, 1));
		opportunity.setStage(OpportunityStage.APPROACH);
		opportunity.setStatus(OpportunityStatus.OPEN);
		when(opportunityRepository.findAll()).thenReturn(List.of(opportunity));

		RevenueForecastRes result = service.forecast(new ForecastQueryReq(null, null));

		assertThat(result.totalExpectedRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.months()).singleElement().satisfies(month -> {
			assertThat(month.expectedRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
			assertThat(month.opportunityCount()).isEqualTo(1);
		});
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

	@Test
	void recordsForecastViewInAuditLog() {
		when(opportunityRepository.findAll()).thenReturn(List.of(
				opportunity("ERP", "100000000", "40", LocalDate.of(2026, 9, 30), OpportunityStatus.OPEN)));

		service.forecast(new ForecastQueryReq(null, null));

		// TC-04: moi lan xem ghi nhat ky nguoi thuc hien, noi dung va thoi diem.
		org.mockito.Mockito.verify(auditLogger).recordForecastView(
				org.mockito.ArgumentMatchers.contains("1 co hoi mo"));
	}

	@Test
	void onlyForecastsOpportunitiesInViewerScope() {
		Opportunity mine = opportunity("Mine", "100000000", "40", LocalDate.of(2026, 9, 30), OpportunityStatus.OPEN);
		mine.setOwnerId(7L);
		Opportunity others = opportunity("Others", "900000000", "40", LocalDate.of(2026, 9, 30), OpportunityStatus.OPEN);
		others.setOwnerId(8L);
		when(opportunityRepository.findAll()).thenReturn(List.of(mine, others));
		when(currentUserScopeProvider.currentScope())
				.thenReturn(new UserScope(com.serviceops.security.scope.DataScopeType.SELF, java.util.Set.of()));
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);

		RevenueForecastRes result = service.forecast(new ForecastQueryReq(null, null));

		// QTN-01: pham vi SELF chi thay co hoi minh phu trach.
		assertThat(result.totalExpectedRevenue()).isEqualByComparingTo("40000000");
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
