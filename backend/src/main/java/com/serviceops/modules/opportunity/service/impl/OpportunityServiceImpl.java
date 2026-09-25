package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
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
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
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
	private final UserRepository userRepository;
	private final OpportunityMapper opportunityMapper;
	private final OpportunityAuditLogger auditLogger;
	private final StageTransitionValidator stageTransitionValidator;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final OpportunityStageDurationCalculator stageDurationCalculator;

	@Override
	@Transactional(readOnly = true)
	public List<OpportunityRes> list() {
		List<Opportunity> allOpportunities = opportunityRepository.findAllByOrderByCreatedAtDesc();
		prefetchOwnersForDepartmentScope(allOpportunities.stream().map(Opportunity::getOwnerId).toList());
		List<Opportunity> opportunities = allOpportunities.stream()
				.filter(this::inCurrentScope)
				.toList();
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

		// So ngay o giai doan hien tai — de danh sach cho biet mot co hoi da "dung" bao
		// lau va con bao xa la den nguong canh bao "qua han xu ly" cua Bao cao duong
		// ong (truoc day chi thay canh bao SAU KHI da qua han, khong co cach nao xem
		// truoc con so nay o dau ca).
		Map<Long, Long> daysInStageById = stageDurationCalculator
				.daysInCurrentStageByOpportunity(opportunities, LocalDateTime.now());

		return opportunities.stream()
				.map(o -> opportunityMapper.toResponse(
						o, customerNameById.get(o.getCustomerId()), daysInStageById.get(o.getId())))
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

	/**
	 * QTN-01: ap dung cho danh sach co hoi giong het CustomerServiceImpl dang lam cho
	 * khach hang (trang "Cơ hội bán hàng" truoc day goi thang repository, khong loc
	 * theo pham vi — moi tai khoan deu thay TOAN BO co hoi cua ca cong ty, phat hien
	 * khi doi chieu voi trang "Khách hàng" cua sale01 chi thay 2/6 khach hang nhung
	 * lai thay co hoi cua ca 6). COMPANY luon qua. SELF: chi hien co hoi do CHINH
	 * nguoi xem phu trach (ownerId). DEPARTMENT: pham vi suy GIAN TIEP tu phong ban
	 * cua chu so huu tai thoi diem goi. Co hoi khong xac dinh ownerId bi loai khoi ca
	 * SELF lan DEPARTMENT, an toan hon la lo nham cho nguoi khong lien quan.
	 */
	private boolean inCurrentScope(Opportunity opportunity) {
		UserScope scope = currentUserScopeProvider.currentScope();
		if (scope.isCompanyWide()) {
			return true;
		}
		if (opportunity.getOwnerId() == null) {
			return false;
		}
		if (scope.type() == DataScopeType.SELF) {
			return opportunity.getOwnerId().equals(currentUserScopeProvider.currentUserId());
		}
		if (scope.type() == DataScopeType.DEPARTMENT) {
			Long ownerDepartmentId = ownerDepartmentId(opportunity.getOwnerId());
			return ownerDepartmentId != null && scope.departmentIds().contains(ownerDepartmentId);
		}
		return false;
	}

	/** Hieu nang: nap truoc chu so huu bang MOT truy van IN (xem CustomerServiceImpl), ket qua loc khong doi. */
	private void prefetchOwnersForDepartmentScope(List<Long> ownerIds) {
		UserScope scope = currentUserScopeProvider.currentScope();
		if (scope.isCompanyWide() || scope.type() != DataScopeType.DEPARTMENT) {
			return;
		}
		List<Long> distinctOwnerIds = ownerIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
		if (!distinctOwnerIds.isEmpty()) {
			userRepository.findAllById(distinctOwnerIds);
		}
	}

	private Long ownerDepartmentId(Long ownerId) {
		return userRepository.findById(ownerId).map(User::getDepartmentId).orElse(null);
	}
}
