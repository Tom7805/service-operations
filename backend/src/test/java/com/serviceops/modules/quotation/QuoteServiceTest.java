package com.serviceops.modules.quotation;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.quotation.dto.request.QuoteCreateReq;
import com.serviceops.modules.quotation.dto.request.QuoteItemReq;
import com.serviceops.modules.quotation.dto.response.QuoteRes;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.repository.QuoteRepository;
import com.serviceops.modules.quotation.service.impl.QuoteServiceImpl;
import com.serviceops.modules.opportunity.service.impl.OpportunityScopeGuard;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.UserScope;
import com.serviceops.modules.rate.entity.BillRate;
import com.serviceops.modules.rate.repository.BillRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuoteServiceTest {

	@Mock
	private OpportunityRepository opportunityRepository;

	@Mock
	private QuoteRepository quoteRepository;

	@Mock
	private BillRateRepository billRateRepository;

	@Mock
	private OpportunityAuditLogger auditLogger;

	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;

	@Mock
	private UserRepository userRepository;

	private QuoteServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new QuoteServiceImpl(opportunityRepository, quoteRepository, billRateRepository, auditLogger,
				new OpportunityScopeGuard(currentUserScopeProvider, userRepository));
		lenient().when(currentUserScopeProvider.currentScope()).thenReturn(UserScope.company());
		lenient().when(quoteRepository.save(any(Quote.class))).thenAnswer(invocation -> {
			Quote quote = invocation.getArgument(0);
			quote.setId(1L);
			return quote;
		});
	}

	@Test
	void calculatesQuoteFromEffectiveRates() {
		Opportunity opportunity = opportunityAtProposal();
		when(opportunityRepository.findById(12L)).thenReturn(Optional.of(opportunity));
		when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(12L)).thenReturn(Optional.empty());
		BillRate rate = rate("Lap trinh vien", "5000000");
		when(billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc("Lap trinh vien",
						LocalDate.now()))
				.thenReturn(Optional.of(rate));

		QuoteRes result = service.create(12L,
				new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", null, new BigDecimal("20")))));

		assertThat(result.version()).isEqualTo(1);
		assertThat(result.totalAmount()).isEqualByComparingTo("100000000");
		assertThat(result.items().get(0).amount()).isEqualByComparingTo("100000000");
		assertThat(result.items().get(0).priced()).isTrue();
		assertThat(result.missingRates()).isEmpty();
		verify(auditLogger).recordQuoteCreate(org.mockito.ArgumentMatchers.eq(12L),
				org.mockito.ArgumentMatchers.startsWith("Lap bao gia phien ban 1"));
		assertThat(result.latest()).isTrue();
	}

	@Test
	void returnsMissingRateWithoutAddingItToTotal() {
		when(opportunityRepository.findById(12L)).thenReturn(Optional.of(opportunityAtProposal()));
		when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(12L)).thenReturn(Optional.empty());
		when(billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc("Kiem thu",
						LocalDate.now()))
				.thenReturn(Optional.empty());

		QuoteRes result = service.create(12L,
				new QuoteCreateReq(List.of(new QuoteItemReq("Kiem thu", null, new BigDecimal("10")))));

		assertThat(result.totalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.missingRates()).containsExactly("Kiem thu");
		assertThat(result.items().get(0).priced()).isFalse();
		assertThat(result.items().get(0).unitRate()).isNull();
	}

	@Test
	void incrementsVersionForNewQuote() {
		when(opportunityRepository.findById(12L)).thenReturn(Optional.of(opportunityAtProposal()));
		Quote previous = new Quote();
		previous.setVersion(3);
		when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(12L)).thenReturn(Optional.of(previous));
		when(billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc("Lap trinh vien",
						LocalDate.now()))
				.thenReturn(Optional.of(rate("Lap trinh vien", "5000000")));

		QuoteRes result = service.create(12L,
				new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", null, new BigDecimal("1")))));

		assertThat(result.version()).isEqualTo(4);
	}

	@Test
	void rejectsOpportunityOutsideProposalStage() {
		Opportunity opportunity = opportunityAtProposal();
		opportunity.setStage(OpportunityStage.APPROACH);
		when(opportunityRepository.findById(12L)).thenReturn(Optional.of(opportunity));

		assertThatThrownBy(() -> service.create(12L,
				new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", null, BigDecimal.ONE)))))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(error -> ((BusinessRuleException) error).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(quoteRepository, never()).save(any());
	}

	@Test
	void usesRateOfSelectedLevelWhenLevelProvided() {
		when(opportunityRepository.findById(12L)).thenReturn(Optional.of(opportunityAtProposal()));
		when(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(12L)).thenReturn(Optional.empty());
		when(billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						"Lap trinh vien", "Cao cap", LocalDate.now()))
				.thenReturn(Optional.of(rate("Lap trinh vien", "8000000")));

		QuoteRes result = service.create(12L,
				new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", "Cao cap", new BigDecimal("10")))));

		assertThat(result.totalAmount()).isEqualByComparingTo("80000000");
		assertThat(result.items().get(0).level()).isEqualTo("Cao cap");
	}

	@Test
	void historyKeepsAllVersionsAndMarksLatest() {
		when(opportunityRepository.findById(12L)).thenReturn(Optional.of(opportunityAtProposal()));
		Quote v2 = new Quote();
		v2.setVersion(2);
		Quote v1 = new Quote();
		v1.setVersion(1);
		com.serviceops.modules.quotation.entity.QuoteItem unpriced = new com.serviceops.modules.quotation.entity.QuoteItem();
		unpriced.setProfessionalRole("Kiem thu");
		unpriced.setWorkDays(BigDecimal.ONE);
		v1.addItem(unpriced);
		when(quoteRepository.findAllByOpportunityIdOrderByVersionDesc(12L)).thenReturn(List.of(v2, v1));

		List<QuoteRes> history = service.getHistory(12L);

		// TC-03: giu ca hai phien ban va danh dau phien ban moi nhat.
		assertThat(history).extracting(QuoteRes::version).containsExactly(2, 1);
		assertThat(history).extracting(QuoteRes::latest).containsExactly(true, false);
		// TC-02: canh bao thieu don gia van hien khi xem lai lich su.
		assertThat(history.get(1).missingRates()).containsExactly("Kiem thu");
	}

	private Opportunity opportunityAtProposal() {
		Opportunity opportunity = new Opportunity();
		opportunity.setId(12L);
		opportunity.setStage(OpportunityStage.PROPOSAL);
		return opportunity;
	}

	private BillRate rate(String role, String dailyRate) {
		BillRate rate = new BillRate();
		rate.setProfessionalRole(role);
		rate.setDailyRate(new BigDecimal(dailyRate));
		rate.setEffectiveFrom(LocalDate.now().minusDays(1));
		return rate;
	}
}