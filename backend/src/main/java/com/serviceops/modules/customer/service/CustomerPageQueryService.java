package com.serviceops.modules.customer.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.serviceops.common.api.PageRes;
import com.serviceops.common.util.PageRequests;
import com.serviceops.common.util.SpecSupport;
import com.serviceops.modules.customer.dto.request.CustomerPageReq;
import com.serviceops.modules.customer.dto.response.CustomerPageSummaryRes;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;

/**
 * Danh sach khach hang phan trang phia may chu. Cung quy tac pham vi (QTN-01) va cung bo loc
 * nhu man danh sach truoc day tu loc tren trinh duyet, nhung chay bang SQL: chi doc dung so
 * dong cua trang dang xem thay vi nap toan bang.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerPageQueryService {

	private final CustomerRepository customerRepository;
	private final CustomerMapper customerMapper;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final EntityManager entityManager;

	public PageRes<CustomerRes, CustomerPageSummaryRes> findPage(CustomerPageReq request) {
		Specification<Customer> scope = SpecSupport.ownerInScope(currentUserScopeProvider.currentScope(),
				currentUserScopeProvider.currentUserId(), "ownerId");
		Specification<Customer> filtered = scope.and(filters(request));

		Page<Customer> page = customerRepository.findAll(filtered, PageRequests.of(request.getPage(),
				request.getSize(), Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
		List<CustomerRes> content = page.getContent().stream().map(customerMapper::toResponse).toList();
		return PageRes.of(page, content, summary(scope));
	}

	private Specification<Customer> filters(CustomerPageReq request) {
		String keyword = SpecSupport.normalize(request.getKeyword());
		String industry = SpecSupport.normalize(request.getIndustry());
		String companySize = SpecSupport.normalize(request.getCompanySize());
		String priority = SpecSupport.normalize(request.getPriority());
		return (root, query, cb) -> {
			List<Predicate> where = new ArrayList<>();
			if (keyword != null) {
				where.add(cb.or(
						SpecSupport.containsIgnoreCase(cb, root.get("name"), keyword),
						SpecSupport.containsIgnoreCase(cb, root.get("code"), keyword),
						SpecSupport.containsIgnoreCase(cb, root.get("taxCode"), keyword),
						SpecSupport.containsIgnoreCase(cb, root.get("phone"), keyword),
						SpecSupport.containsIgnoreCase(cb, root.get("industry"), keyword),
						SpecSupport.containsIgnoreCase(cb, root.get("address"), keyword)));
			}
			if (industry != null) {
				where.add(SpecSupport.equalsIgnoreCase(cb, root.get("industry"), industry));
			}
			if (companySize != null) {
				where.add(SpecSupport.equalsIgnoreCase(cb, root.get("companySize"), companySize));
			}
			if (priority != null) {
				where.add(SpecSupport.equalsIgnoreCase(cb, root.get("priority"), priority));
			}
			return cb.and(where.toArray(Predicate[]::new));
		};
	}

	private CustomerPageSummaryRes summary(Specification<Customer> scope) {
		LocalDate today = LocalDate.now();
		Specification<Customer> createdToday = (root, query, cb) -> cb.and(
				cb.greaterThanOrEqualTo(root.get("createdAt"), today.atStartOfDay()),
				cb.lessThan(root.get("createdAt"), today.plusDays(1).atStartOfDay()));
		return new CustomerPageSummaryRes(
				customerRepository.count(scope),
				customerRepository.count(scope.and(createdToday)),
				SpecSupport.distinctValues(entityManager, Customer.class, scope, "industry"),
				SpecSupport.distinctValues(entityManager, Customer.class, scope, "companySize"),
				SpecSupport.distinctValues(entityManager, Customer.class, scope, "priority"));
	}
}
