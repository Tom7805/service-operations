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

	private QuoteServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new QuoteServiceImpl(opportunityRepository, quoteRepository, billRateRepository, auditLogger);
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
				new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", new BigDecimal("20")))));

		assertThat(result.version()).isEqualTo(1);
		assertThat(result.totalAmount()).isEqualByComparingTo("100000000");
		assertThat(result.items().get(0).amount()).isEqualByComparingTo("100000000");
		assertThat(result.items().get(0).priced()).isTrue();
		assertThat(result.missingRates()).isEmpty();
		verify(auditLogger).recordCreate(12L, "Lap bao gia phien ban 1");
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
				new QuoteCreateReq(List.of(new QuoteItemReq("Kiem thu", new BigDecimal("10")))));

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
				new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", new BigDecimal("1")))));

		assertThat(result.version()).isEqualTo(4);
	}

	@Test
	void rejectsOpportunityOutsideProposalStage() {
		Opportunity opportunity = opportunityAtProposal();
		opportunity.setStage(OpportunityStage.APPROACH);
		when(opportunityRepository.findById(12L)).thenReturn(Optional.of(opportunity));

		assertThatThrownBy(() -> service.create(12L,
				new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", BigDecimal.ONE)))))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(error -> ((BusinessRuleException) error).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(quoteRepository, never()).save(any());
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