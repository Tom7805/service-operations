package com.serviceops.modules.customer.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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

	@Override
	public CustomerRes create(CustomerCreateReq request) {
		String name = request.name().trim();
		if (name.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ten khach hang khong duoc de trong");
		}

		Customer customer = new Customer();
		customer.setCode(generateUniqueCode());
		customer.setName(name);
		customer.setTaxCode(blankToNull(request.taxCode()));
		customer.setIndustry(blankToNull(request.industry()));
		customer.setAddress(blankToNull(request.address()));
		customer.setCreatedBy(currentUsername());
		customer.setCreatedAt(LocalDateTime.now());

		Customer saved = customerRepository.save(customer);
		log.info("CUSTOMER_CREATED code={} createdBy={}", saved.getCode(), saved.getCreatedBy());
		return customerMapper.toResponse(saved);
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

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
