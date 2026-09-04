package com.serviceops.modules.quotation.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.quotation.dto.request.QuoteCreateReq;
import com.serviceops.modules.quotation.dto.request.QuoteItemReq;
import com.serviceops.modules.quotation.dto.response.QuoteItemRes;
import com.serviceops.modules.quotation.dto.response.QuoteRes;
import com.serviceops.modules.quotation.entity.Quote;
import com.serviceops.modules.quotation.entity.QuoteItem;
import com.serviceops.modules.quotation.repository.QuoteRepository;
import com.serviceops.modules.quotation.service.QuoteService;
import com.serviceops.modules.rate.entity.BillRate;
import com.serviceops.modules.rate.repository.BillRateRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class QuoteServiceImpl implements QuoteService {

	private final OpportunityRepository opportunityRepository;
	private final QuoteRepository quoteRepository;
	private final BillRateRepository billRateRepository;
	private final OpportunityAuditLogger auditLogger;

	public QuoteServiceImpl(OpportunityRepository opportunityRepository, QuoteRepository quoteRepository,
			BillRateRepository billRateRepository, OpportunityAuditLogger auditLogger) {
		this.opportunityRepository = opportunityRepository;
		this.quoteRepository = quoteRepository;
		this.billRateRepository = billRateRepository;
		this.auditLogger = auditLogger;
	}

	@Override
	public QuoteRes create(Long opportunityId, QuoteCreateReq request) {
		Opportunity opportunity = opportunityRepository.findById(opportunityId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay co hoi voi id=" + opportunityId));
		if (opportunity.getStage() != OpportunityStage.PROPOSAL) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi co hoi o giai doan PROPOSAL moi duoc lap bao gia");
		}

		Quote quote = new Quote();
		quote.setOpportunityId(opportunityId);
		quote.setVersion(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(opportunityId)
				.map(existing -> existing.getVersion() + 1).orElse(1));
		quote.setCreatedBy(currentUsername());
		quote.setCreatedAt(LocalDateTime.now());

		BigDecimal total = BigDecimal.ZERO;
		List<String> missingRates = new ArrayList<>();
		for (QuoteItemReq requestItem : request.items()) {
			String role = requestItem.professionalRole().trim();
			QuoteItem item = new QuoteItem();
			item.setProfessionalRole(role);
			item.setWorkDays(requestItem.workDays());

			BillRate rate = billRateRepository
					.findTopByProfessionalRoleIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(role,
							LocalDate.now())
					.orElse(null);
			if (rate == null) {
				missingRates.add(role);
			} else {
				BigDecimal amount = requestItem.workDays().multiply(rate.getDailyRate());
				item.setUnitRate(rate.getDailyRate());
				item.setAmount(amount);
				total = total.add(amount);
			}
			quote.addItem(item);
		}
		quote.setTotalAmount(total);
		Quote saved = quoteRepository.save(quote);
		auditLogger.recordCreate(opportunityId, "Lap bao gia phien ban " + saved.getVersion());
		return toResponse(saved, missingRates);
	}

	private QuoteRes toResponse(Quote quote, List<String> missingRates) {
		List<QuoteItemRes> items = quote.getItems().stream()
				.map(item -> new QuoteItemRes(item.getProfessionalRole(), item.getWorkDays(), item.getUnitRate(),
						item.getAmount(), item.getUnitRate() != null))
				.toList();
		return new QuoteRes(quote.getId(), quote.getOpportunityId(), quote.getVersion(), quote.getTotalAmount(),
				items, missingRates, quote.getCreatedBy(), quote.getCreatedAt());
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}