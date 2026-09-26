package com.serviceops.modules.quotation.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.impl.OpportunityScopeGuard;
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
import java.util.List;
import java.util.Optional;

/**
 * NCL-03-CN-003: Lap bao gia cho co hoi.
 *
 * <ul>
 *   <li>Dieu kien: co hoi dang o giai doan bao gia ({@link OpportunityStage#PROPOSAL}).</li>
 *   <li>TC-01: moi dong = so ngay cong x don gia ban dang hieu luc hom nay cua (vai tro, cap bac)
 *       — QTN-15; tong bao gia la tong cac dong co don gia.</li>
 *   <li>TC-02: vai tro chua co don gia hieu luc duoc canh bao ({@code missingRates}) va KHONG
 *       cong vao tong.</li>
 *   <li>TC-03: moi lan lap la mot phien ban moi; giu moi phien ban cu va danh dau phien ban moi
 *       nhat ({@code latest}).</li>
 *   <li>TC-04: vai tro khac Nhan vien kinh doanh bi chan o controller va ghi nhat ky tu choi.</li>
 *   <li>TC-05: moi lan lap bao gia ghi nhat ky {@code QUOTE_CREATE}.</li>
 * </ul>
 */
@Service
@Transactional
public class QuoteServiceImpl implements QuoteService {

	private final OpportunityRepository opportunityRepository;
	private final QuoteRepository quoteRepository;
	private final BillRateRepository billRateRepository;
	private final OpportunityAuditLogger auditLogger;
	private final OpportunityScopeGuard scopeGuard;

	public QuoteServiceImpl(OpportunityRepository opportunityRepository, QuoteRepository quoteRepository,
			BillRateRepository billRateRepository, OpportunityAuditLogger auditLogger,
			OpportunityScopeGuard scopeGuard) {
		this.opportunityRepository = opportunityRepository;
		this.quoteRepository = quoteRepository;
		this.billRateRepository = billRateRepository;
		this.auditLogger = auditLogger;
		this.scopeGuard = scopeGuard;
	}

	@Override
	public QuoteRes create(Long opportunityId, QuoteCreateReq request) {
		Opportunity opportunity = findInScope(opportunityId);
		if (opportunity.getStage() != OpportunityStage.PROPOSAL) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi co hoi o giai doan bao gia (PROPOSAL) moi duoc lap bao gia. Giai doan hien tai: "
							+ opportunity.getStage());
		}

		Quote quote = new Quote();
		quote.setOpportunityId(opportunityId);
		quote.setVersion(quoteRepository.findTopByOpportunityIdOrderByVersionDesc(opportunityId)
				.map(existing -> existing.getVersion() + 1).orElse(1));
		quote.setCreatedBy(currentUsername());
		quote.setCreatedAt(LocalDateTime.now());

		LocalDate today = LocalDate.now();
		BigDecimal total = BigDecimal.ZERO;
		for (QuoteItemReq requestItem : request.items()) {
			String role = requestItem.professionalRole().trim();
			String level = blankToNull(requestItem.level());
			QuoteItem item = new QuoteItem();
			item.setProfessionalRole(role);
			item.setLevel(level);
			item.setWorkDays(requestItem.workDays());

			BillRate rate = findEffectiveRate(role, level, today).orElse(null);
			if (rate != null) {
				BigDecimal amount = requestItem.workDays().multiply(rate.getDailyRate());
				item.setUnitRate(rate.getDailyRate());
				item.setAmount(amount);
				total = total.add(amount);
			}
			quote.addItem(item);
		}
		quote.setTotalAmount(total);
		Quote saved = quoteRepository.save(quote);

		List<String> missingRates = missingRates(saved);
		auditLogger.recordQuoteCreate(opportunityId, "Lap bao gia phien ban " + saved.getVersion()
				+ ", tong " + total.toPlainString()
				+ (missingRates.isEmpty() ? "" : "; thieu don gia: " + String.join(", ", missingRates)));
		return toResponse(saved, true);
	}

	@Override
	@Transactional(readOnly = true)
	public List<QuoteRes> getHistory(Long opportunityId) {
		findInScope(opportunityId);
		List<Quote> quotes = quoteRepository.findAllByOpportunityIdOrderByVersionDesc(opportunityId);
		Integer latestVersion = quotes.isEmpty() ? null : quotes.get(0).getVersion();
		return quotes.stream()
				.map(quote -> toResponse(quote, quote.getVersion().equals(latestVersion)))
				.toList();
	}

	private Opportunity findInScope(Long opportunityId) {
		Opportunity opportunity = opportunityRepository.findById(opportunityId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay co hoi voi id=" + opportunityId));
		// QTN-01: chi lap / xem bao gia cua co hoi thuoc pham vi du lieu cua minh.
		scopeGuard.requireInScope(opportunity);
		return opportunity;
	}

	/** QTN-15: don gia co ngay hieu luc gan nhat truoc hoac bang ngay lap bao gia. */
	private Optional<BillRate> findEffectiveRate(String role, String level, LocalDate asOf) {
		if (level != null) {
			return billRateRepository
					.findTopByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
							role, level, asOf);
		}
		return billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(role, asOf);
	}

	/** Cac dong chua co don gia (TC-02) — suy tu du lieu da luu nen lich su van hien canh bao. */
	private List<String> missingRates(Quote quote) {
		return quote.getItems().stream()
				.filter(item -> item.getUnitRate() == null)
				.map(item -> item.getLevel() == null
						? item.getProfessionalRole()
						: item.getProfessionalRole() + " (" + item.getLevel() + ")")
				.distinct()
				.toList();
	}

	private QuoteRes toResponse(Quote quote, boolean latest) {
		List<QuoteItemRes> items = quote.getItems().stream()
				.map(item -> new QuoteItemRes(item.getProfessionalRole(), item.getLevel(), item.getWorkDays(),
						item.getUnitRate(), item.getAmount(), item.getUnitRate() != null))
				.toList();
		return new QuoteRes(quote.getId(), quote.getOpportunityId(), quote.getVersion(), latest,
				quote.getTotalAmount(), items, missingRates(quote), quote.getCreatedBy(), quote.getCreatedAt());
	}

	private String blankToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
