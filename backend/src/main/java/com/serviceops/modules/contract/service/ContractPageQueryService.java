package com.serviceops.modules.contract.service;

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
import com.serviceops.modules.contract.dto.response.ContractPageSummaryRes;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.mapper.ContractMapper;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;

/** Danh sach hop dong phan trang phia may chu — cung bo loc voi man "Hop dong" truoc day loc tren trinh duyet. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContractPageQueryService {

	private final ContractRepository contractRepository;
	private final CustomerRepository customerRepository;
	private final ContractMapper contractMapper;

	public PageRes<ContractRes, ContractPageSummaryRes> findPage(String keyword, ContractStatus status, Integer page,
			Integer size) {
		Page<Contract> result = contractRepository.findAll(filters(keyword, status),
				PageRequests.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
		return PageRes.of(result, toResponses(result.getContent()), summary());
	}

	private Specification<Contract> filters(String keyword, ContractStatus status) {
		String normalized = SpecSupport.normalize(keyword);
		return (root, query, cb) -> {
			List<Predicate> where = new ArrayList<>();
			if (normalized != null) {
				where.add(cb.or(
						SpecSupport.containsIgnoreCase(cb, root.get("contractCode"), normalized),
						SpecSupport.containsIgnoreCase(cb, root.get("name"), normalized),
						SpecSupport.relatedNameContains(query, cb, root.get("customerId"), Customer.class, "name",
								normalized)));
			}
			if (status != null) {
				where.add(cb.equal(root.get("status"), status));
			}
			return cb.and(where.toArray(Predicate[]::new));
		};
	}

	private List<ContractRes> toResponses(List<Contract> contracts) {
		Map<Long, String> customerNames = customerRepository
				.findAllById(contracts.stream().map(Contract::getCustomerId).filter(Objects::nonNull).distinct()
						.toList())
				.stream()
				.collect(Collectors.toMap(Customer::getId, Customer::getName, (a, b) -> a));
		return contracts.stream().map(c -> contractMapper.toResponse(c, customerNames.get(c.getCustomerId())))
				.toList();
	}

	private ContractPageSummaryRes summary() {
		Specification<Contract> noLimit = (root, query, cb) -> cb.isNull(root.get("limitValue"));
		return new ContractPageSummaryRes(
				contractRepository.count(),
				contractRepository.count(statusIs(ContractStatus.ACTIVE)),
				contractRepository.count(statusIs(ContractStatus.DRAFT)),
				contractRepository.count(noLimit));
	}

	private static Specification<Contract> statusIs(ContractStatus status) {
		return (root, query, cb) -> cb.equal(root.get("status"), status);
	}
}
