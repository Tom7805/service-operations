package com.serviceops.modules.opportunity.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.serviceops.common.api.PageRes;
import com.serviceops.common.util.PageRequests;
import com.serviceops.common.util.SpecSupport;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.opportunity.dto.response.OpportunityPageSummaryRes;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.mapper.OpportunityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.impl.OpportunityStageDurationCalculator;
import com.serviceops.security.scope.CurrentUserScopeProvider;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;

/**
 * Danh sach co hoi ban hang phan trang phia may chu. Cung pham vi QTN-01 va cung bo loc nhu
 * man danh sach truoc day loc tren trinh duyet. Ten khach hang va so ngay o giai doan hien tai
 * chi tinh cho cac dong cua trang dang xem (truoc day tinh cho toan bo pipeline moi lan mo).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OpportunityPageQueryService {

	private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

	private final OpportunityRepository opportunityRepository;
	private final CustomerRepository customerRepository;
	private final OpportunityMapper opportunityMapper;
	private final OpportunityStageDurationCalculator stageDurationCalculator;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final EntityManager entityManager;

	/**
	 * @param id chi lay dung co hoi nay (neu nam trong pham vi) — de mo thang mot co hoi khi duoc dieu
	 *           huong tu noi khac (Bao cao duong ong) ma khong phai nap ca pipeline de tim; {@code null} = khong loc
	 */
	public PageRes<OpportunityRes, OpportunityPageSummaryRes> findPage(String keyword, OpportunityStage stage, Long id,
			Integer page, Integer size) {
		Specification<Opportunity> scope = SpecSupport.ownerInScope(currentUserScopeProvider.currentScope(),
				currentUserScopeProvider.currentUserId(), "ownerId");

		Page<Opportunity> result = opportunityRepository.findAll(scope.and(filters(keyword, stage, id)),
				PageRequests.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
		return PageRes.of(result, toResponses(result.getContent()), summary(scope));
	}

	private Specification<Opportunity> filters(String keyword, OpportunityStage stage, Long id) {
		String normalized = SpecSupport.normalize(keyword);
		return (root, query, cb) -> {
			List<Predicate> where = new ArrayList<>();
			if (normalized != null) {
				where.add(cb.or(
						SpecSupport.containsIgnoreCase(cb, root.get("name"), normalized),
						SpecSupport.relatedNameContains(query, cb, root.get("customerId"), Customer.class, "name",
								normalized)));
			}
			if (stage != null) {
				where.add(cb.equal(root.get("stage"), stage));
			}
			if (id != null) {
				where.add(cb.equal(root.get("id"), id));
			}
			return cb.and(where.toArray(Predicate[]::new));
		};
	}

	private List<OpportunityRes> toResponses(List<Opportunity> opportunities) {
		if (opportunities.isEmpty()) {
			return List.of();
		}
		Map<Long, String> customerNameById = customerRepository
				.findAllById(opportunities.stream().map(Opportunity::getCustomerId).filter(Objects::nonNull)
						.distinct().toList())
				.stream()
				.collect(Collectors.toMap(Customer::getId, Customer::getName, (a, b) -> a));
		Map<Long, Long> daysInStageById = stageDurationCalculator
				.daysInCurrentStageByOpportunity(opportunities, LocalDateTime.now());
		return opportunities.stream()
				.map(o -> opportunityMapper.toResponse(o, customerNameById.get(o.getCustomerId()),
						daysInStageById.get(o.getId())))
				.toList();
	}

	private OpportunityPageSummaryRes summary(Specification<Opportunity> scope) {
		Specification<Opportunity> won = (root, query, cb) -> cb.equal(root.get("stage"), OpportunityStage.WON);
		BigDecimal total = SpecSupport.sum(entityManager, Opportunity.class, scope,
				(root, cb) -> root.get("expectedValue"));
		// Gia tri x xac suat (%); dong thieu mot trong hai so bi bo qua — giong cach tinh cu (coi nhu 0).
		BigDecimal weightedPercent = SpecSupport.sum(entityManager, Opportunity.class, scope,
				(root, cb) -> cb.prod(root.<BigDecimal>get("expectedValue"), root.<BigDecimal>get("probability")));
		return new OpportunityPageSummaryRes(
				opportunityRepository.count(scope),
				total,
				weightedPercent.divide(HUNDRED, 2, RoundingMode.HALF_UP),
				opportunityRepository.count(scope.and(won)));
	}
}
