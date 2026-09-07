package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.mapper.OpportunityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.OpportunityService;
import com.serviceops.modules.opportunity.validator.StageTransitionValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-03-CN-001: Tao co hoi ban hang.
 *
 * <p>Dieu kien bat dau: khach hang da co ho so trong he thong (TC-01). Gia tri du kien
 * phai la so duong (TC-02). Co hoi duoc tao o giai doan dau tien {@link OpportunityStage#APPROACH}
 * va hien trong duong ong ban hang (QTN-06). Thao tac tao duoc ghi nhat ky (TC-04).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OpportunityServiceImpl implements OpportunityService {

	private final OpportunityRepository opportunityRepository;
	private final CustomerRepository customerRepository;
	private final OpportunityMapper opportunityMapper;
	private final OpportunityAuditLogger auditLogger;
	private final StageTransitionValidator stageTransitionValidator;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	@Override
	@Transactional(readOnly = true)
	public List<OpportunityRes> list() {
		List<Opportunity> opportunities = opportunityRepository.findAllByOrderByCreatedAtDesc();
		if (opportunities.isEmpty()) {
			return List.of();
		}

		// Lay ten khach hang theo lo de tranh N+1 query.
		Map<Long, String> customerNameById = customerRepository
				.findAllById(opportunities.stream()
						.map(Opportunity::getCustomerId)
						.filter(java.util.Objects::nonNull)
						.distinct()
						.toList())
				.stream()
				.collect(Collectors.toMap(Customer::getId, Customer::getName, (a, b) -> a));

		return opportunities.stream()
				.map(o -> opportunityMapper.toResponse(o, customerNameById.get(o.getCustomerId())))
				.toList();
	}

	@Override
	public OpportunityRes create(OpportunityCreateReq request) {
		String name = request.name().trim();
		if (name.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ten co hoi khong duoc de trong");
		}

		// TC-01: khach hang phai da co ho so trong he thong.
		Customer customer = customerRepository.findById(request.customerId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so khach hang voi id=" + request.customerId()));

		// TC-02: gia tri du kien khong duoc la so am.
		if (request.expectedValue() == null || request.expectedValue().compareTo(BigDecimal.ZERO) < 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Gia tri du kien phai la so duong");
		}

		// Chan tao trung ten cho cung mot khach hang — tranh tao lap lai nhieu
		// ban ghi giong het nhau (da tung xay ra voi du lieu that trong he
		// thong, gay dem trung va sai lech so lieu du bao doanh thu).
		if (opportunityRepository.existsByCustomerIdAndNameIgnoreCase(customer.getId(), name)) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Khach hang nay da co co hoi trung ten \"" + name + "\". Vui long doi ten khac de phan biet.");
		}

		Opportunity opportunity = new Opportunity();
		opportunity.setName(name);
		opportunity.setCustomerId(customer.getId());
		opportunity.setExpectedValue(request.expectedValue());
		opportunity.setExpectedCloseDate(request.expectedCloseDate());
		// Nguoi phu trach: mac dinh la nguoi tao neu khong duoc chi dinh.
		opportunity.setOwnerId(request.ownerId() != null
				? request.ownerId() : currentUserScopeProvider.currentUserId());
		// QTN-06 / TC-01: co hoi duoc tao o giai doan dau tien, kem dung xac suat cua giai
		// doan do (truoc day thieu dong nay nen probability = null, giao dien hien "% xac
		// suat" thay vi "10% xac suat").
		opportunity.setStage(stageTransitionValidator.initialStage());
		opportunity.setProbability(stageTransitionValidator.initialProbability());
		opportunity.setStatus(OpportunityStatus.OPEN);
		opportunity.setCreatedBy(currentUsername());
		opportunity.setCreatedAt(LocalDateTime.now());

		Opportunity saved = opportunityRepository.save(opportunity);

		// TC-04: ghi nhat ky nguoi thuc hien, noi dung va thoi diem.
		auditLogger.recordCreate(saved.getId(), "Tao co hoi ban hang: " + saved.getName());

		log.info("OPPORTUNITY_CREATED id={} name={} customerId={} by={}",
				saved.getId(), saved.getName(), saved.getCustomerId(),
				currentUserScopeProvider.currentUserId());
		return opportunityMapper.toResponse(saved, customer.getName());
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
