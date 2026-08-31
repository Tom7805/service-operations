package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.PipelineStageRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.mapper.OpportunityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.OpportunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * NCL-XX (Pipeline ban hang): quan ly co hoi kinh doanh va bang Kanban theo giai doan.
 * Nhan vien kinh doanh (VT-04) va Quan ly du an (VT-02) thao tac chinh, tuong tu quy uoc phan
 * quyen module Khach hang.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class OpportunityServiceImpl implements OpportunityService {

	private static final Map<OpportunityStage, String> STAGE_LABELS = Map.of(
		OpportunityStage.NEW, "Mới",
		OpportunityStage.CONTACTED, "Đã liên hệ",
		OpportunityStage.PROPOSAL, "Báo giá",
		OpportunityStage.NEGOTIATION, "Đàm phán",
		OpportunityStage.WON, "Thắng",
		OpportunityStage.LOST, "Thua"
	);

	private final OpportunityRepository opportunityRepository;
	private final CustomerRepository customerRepository;
	private final UserRepository userRepository;
	private final OpportunityMapper opportunityMapper;

	@Override
	@Transactional(readOnly = true)
	public List<PipelineStageRes> getPipeline() {
		List<Opportunity> all = opportunityRepository.findAllByOrderByCreatedAtDesc();

		Map<Long, String> customerNames = new HashMap<>();
		Map<Long, String> ownerNames = new HashMap<>();
		for (Opportunity o : all) {
			customerNames.computeIfAbsent(o.getCustomerId(), this::resolveCustomerName);
			if (o.getOwnerUserId() != null) {
				ownerNames.computeIfAbsent(o.getOwnerUserId(), this::resolveUserName);
			}
		}

		Map<OpportunityStage, List<Opportunity>> grouped = all.stream()
			.collect(Collectors.groupingBy(Opportunity::getStage));

		return java.util.Arrays.stream(OpportunityStage.values())
			.map(stage -> {
				List<Opportunity> items = grouped.getOrDefault(stage, List.of());
				List<OpportunityRes> res = items.stream()
					.map(o -> opportunityMapper.toResponse(o, customerNames.get(o.getCustomerId()),
						o.getOwnerUserId() == null ? null : ownerNames.get(o.getOwnerUserId())))
					.toList();
				BigDecimal total = items.stream()
					.map(o -> o.getAmount() == null ? BigDecimal.ZERO : o.getAmount())
					.reduce(BigDecimal.ZERO, BigDecimal::add);
				return new PipelineStageRes(stage.name(), STAGE_LABELS.get(stage), items.size(), total, res);
			})
			.toList();
	}

	@Override
	public OpportunityRes create(OpportunityCreateReq request) {
		Customer customer = customerRepository.findById(request.customerId())
			.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
				"Không tìm thấy khách hàng"));

		Opportunity opportunity = new Opportunity();
		opportunity.setName(request.name());
		opportunity.setCustomerId(customer.getId());
		opportunity.setOwnerUserId(request.ownerUserId());
		opportunity.setAmount(request.amount());
		opportunity.setExpectedCloseDate(request.expectedCloseDate());
		opportunity.setNote(request.note());
		opportunity.setStage(OpportunityStage.NEW);
		opportunity.setCreatedAt(LocalDateTime.now());
		opportunityRepository.save(opportunity);

		String ownerName = request.ownerUserId() == null ? null : resolveUserName(request.ownerUserId());
		return opportunityMapper.toResponse(opportunity, customer.getName(), ownerName);
	}

	@Override
	public OpportunityRes changeStage(Long opportunityId, OpportunityStage newStage) {
		Opportunity opportunity = opportunityRepository.findById(opportunityId)
			.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
				"Không tìm thấy cơ hội kinh doanh"));

		opportunity.setStage(newStage);
		opportunity.setUpdatedAt(LocalDateTime.now());
		opportunityRepository.save(opportunity);

		String customerName = resolveCustomerName(opportunity.getCustomerId());
		String ownerName = opportunity.getOwnerUserId() == null ? null : resolveUserName(opportunity.getOwnerUserId());
		return opportunityMapper.toResponse(opportunity, customerName, ownerName);
	}

	private String resolveCustomerName(Long customerId) {
		return customerRepository.findById(customerId).map(Customer::getName).orElse(null);
	}

	private String resolveUserName(Long userId) {
		return userRepository.findById(userId).map(User::getFullName).orElse(null);
	}
}
