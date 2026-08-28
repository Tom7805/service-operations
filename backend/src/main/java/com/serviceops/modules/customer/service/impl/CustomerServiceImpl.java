package com.serviceops.modules.customer.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.CustomerSearchReq;
import com.serviceops.modules.customer.dto.request.DuplicateOverrideReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerDuplicateOverrideLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerDuplicateService;
import com.serviceops.modules.customer.service.CustomerService;
import com.serviceops.modules.customer.validator.CustomerDuplicateValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * NCL-02-CN-001: Tao ho so khach hang. Ma khach hang duoc he thong tu cap va bat buoc
 * duy nhat trong toan he thong theo QTN-05.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerServiceImpl implements CustomerService {

	private static final String CODE_PREFIX = "KH-";

	private final CustomerRepository customerRepository;
	private final CustomerMapper customerMapper;
	private final CustomerDuplicateService customerDuplicateService;
	private final CustomerDuplicateOverrideLogRepository overrideLogRepository;
	private final CustomerAuditLogRepository auditLogRepository;
	private final CustomerDuplicateValidator customerDuplicateValidator;

	@Override
	public CustomerRes create(CustomerCreateReq request) {
		String name = request.name().trim();
		if (name.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ten khach hang khong duoc de trong");
		}

		// NCL-02-CN-002 (TC-01): chan luu khi co ho so nghi trung giong cao.
		List<DuplicateCandidateRes> candidates =
				customerDuplicateService.findDuplicates(name, request.taxCode(), request.phone());
		customerDuplicateValidator.validate(candidates);

		Customer customer = new Customer();
		customer.setCode(generateUniqueCode());
		customer.setName(name);
		customer.setTaxCode(blankToNull(request.taxCode()));
		customer.setPhone(blankToNull(request.phone()));
		customer.setIndustry(blankToNull(request.industry()));
		customer.setAddress(blankToNull(request.address()));
		customer.setCreatedBy(currentUsername());
		customer.setCreatedAt(LocalDateTime.now());

		Customer saved = customerRepository.save(customer);
		recordAudit(saved.getId(), CustomerAuditAction.CREATE, "Tao ho so khach hang: " + saved.getName());
		log.info("CUSTOMER_CREATED code={} createdBy={}", saved.getCode(), saved.getCreatedBy());
		return customerMapper.toResponse(saved);
	}

	@Override
	@Transactional(readOnly = true)
	public List<CustomerRes> findAll(CustomerSearchReq request) {
		String keyword = normalizeKeyword(request == null ? null : request.getKeyword());
		return customerRepository.findAllByOrderByCreatedAtDesc().stream()
				.filter(customer -> keyword == null || matchesKeyword(customer, keyword))
				.map(customerMapper::toResponse)
				.toList();
	}

	@Override
	public List<DuplicateCandidateRes> checkDuplicates(CustomerCreateReq request) {
		return customerDuplicateService.findDuplicates(request.name(), request.taxCode(), request.phone());
	}

	@Override
	public CustomerRes createWithOverride(CustomerCreateReq request, DuplicateOverrideReq override) {
		customerDuplicateValidator.validateOverrideReason(override.reason());
		Customer customer = buildCustomer(request);
		Customer saved = customerRepository.save(customer);

		CustomerDuplicateOverrideLog audit = new CustomerDuplicateOverrideLog();
		audit.setCustomerId(saved.getId());
		audit.setReason(override.reason().trim());
		audit.setOverriddenByUserId(currentUserId());
		overrideLogRepository.save(audit);

		recordAudit(saved.getId(), CustomerAuditAction.CREATE_WITH_OVERRIDE,
				"Tao ho so moi bo qua canh bao trung. Ly do: " + override.reason().trim());

		log.info("CUSTOMER_CREATED_WITH_OVERRIDE code={} customerId={} by={}", saved.getCode(),
			saved.getId(), currentUserId());
		return customerMapper.toResponse(saved);
	}

	private Customer buildCustomer(CustomerCreateReq request) {
		String name = request.name().trim();
		if (name.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ten khach hang khong duoc de trong");
		}
		Customer customer = new Customer();
		customer.setCode(generateUniqueCode());
		customer.setName(name);
		customer.setTaxCode(blankToNull(request.taxCode()));
		customer.setPhone(blankToNull(request.phone()));
		customer.setIndustry(blankToNull(request.industry()));
		customer.setAddress(blankToNull(request.address()));
		customer.setCreatedBy(currentUsername());
		customer.setCreatedAt(LocalDateTime.now());
		return customer;
	}

	private String generateUniqueCode() {
		String code;
		do {
			code = CODE_PREFIX + String.format("%06d", (long) (Math.random() * 1_000_000));
		} while (customerRepository.existsByCode(code));
		return code;
	}

	private String blankToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private String normalizeKeyword(String keyword) {
		if (keyword == null) {
			return null;
		}
		String trimmed = keyword.trim().toLowerCase();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private boolean matchesKeyword(Customer customer, String keyword) {
		return containsIgnoreCase(customer.getName(), keyword)
				|| containsIgnoreCase(customer.getCode(), keyword)
				|| containsIgnoreCase(customer.getTaxCode(), keyword)
				|| containsIgnoreCase(customer.getPhone(), keyword);
	}

	private boolean containsIgnoreCase(String value, String keyword) {
		return value != null && value.toLowerCase().contains(keyword);
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}

	private Long currentUserId() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof com.serviceops.security.CustomUserDetails details)) {
			return null;
		}
		return details.getId();
	}

	private void recordAudit(Long customerId, CustomerAuditAction action, String detail) {
		CustomerAuditLog log = new CustomerAuditLog();
		log.setCustomerId(customerId);
		log.setActionType(action);
		log.setDetail(detail);
		log.setActorUserId(currentUserId());
		log.setActorUsername(currentUsername());
		auditLogRepository.save(log);
	}
}
