package com.serviceops.modules.customer.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerContactReq;
import com.serviceops.modules.customer.dto.response.CustomerContactRes;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerContact;
import com.serviceops.modules.customer.enums.ContactRole;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.mapper.CustomerContactMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerContactRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerContactService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * NCL-02-CN-003: Quan ly nguoi lien he cua khach hang. Moi khach hang chi co
 * duy nhat mot dau moi chinh tai mot thoi diem; danh dau dau moi chinh moi se
 * tu dong chuyen dau moi chinh cu (neu co) thanh dau moi phu (TC-02).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerContactServiceImpl implements CustomerContactService {

	private final CustomerRepository customerRepository;
	private final CustomerContactRepository customerContactRepository;
	private final CustomerContactMapper customerContactMapper;
	private final CustomerAuditLogRepository auditLogRepository;

	@Override
	public List<CustomerContactRes> listByCustomer(Long customerId) {
		requireCustomerExists(customerId);
		return customerContactRepository.findByCustomerId(customerId).stream()
				.sorted(Comparator.comparing((CustomerContact c) -> c.getRole() != ContactRole.PRIMARY)
						.thenComparing(CustomerContact::getCreatedAt))
				.map(customerContactMapper::toResponse)
				.toList();
	}

	@Override
	public CustomerContactRes addContact(Long customerId, CustomerContactReq request) {
		requireCustomerExists(customerId);

		String fullName = request.fullName().trim();
		if (fullName.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ho ten nguoi lien he khong duoc de trong");
		}

		CustomerContact contact = new CustomerContact();
		contact.setCustomerId(customerId);
		contact.setFullName(fullName);
		contact.setTitle(blankToNull(request.title()));
		contact.setEmail(blankToNull(request.email()));
		contact.setPhone(blankToNull(request.phone()));
		contact.setRole(ContactRole.SECONDARY);
		contact.setCreatedBy(currentUsername());
		contact.setCreatedAt(LocalDateTime.now());

		if (request.isPrimary()) {
			// TC-02: dam bao chi duy nhat mot dau moi chinh cho moi khach hang.
			demoteCurrentPrimary(customerId, null);
			contact.setRole(ContactRole.PRIMARY);
		}

		CustomerContact saved = customerContactRepository.save(contact);

		recordAudit(customerId, CustomerAuditAction.CONTACT_ADD,
				"Them nguoi lien he: " + saved.getFullName()
						+ (saved.getRole() == ContactRole.PRIMARY ? " (dau moi chinh)" : ""));

		log.info("CUSTOMER_CONTACT_ADDED customerId={} contactId={} primary={}", customerId, saved.getId(),
				saved.getRole() == ContactRole.PRIMARY);
		return customerContactMapper.toResponse(saved);
	}

	@Override
	public CustomerContactRes setPrimary(Long customerId, Long contactId) {
		requireCustomerExists(customerId);
		CustomerContact contact = customerContactRepository.findById(contactId)
				.filter(c -> c.getCustomerId().equals(customerId))
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay nguoi lien he thuoc khach hang nay"));

		// TC-02: chuyen dau moi chinh hien tai (neu co va khac nguoi nay) thanh dau moi phu.
		demoteCurrentPrimary(customerId, contactId);
		contact.setRole(ContactRole.PRIMARY);
		CustomerContact saved = customerContactRepository.save(contact);

		recordAudit(customerId, CustomerAuditAction.CONTACT_SET_PRIMARY,
				"Danh dau dau moi chinh: " + saved.getFullName());

		log.info("CUSTOMER_CONTACT_SET_PRIMARY customerId={} contactId={}", customerId, contactId);
		return customerContactMapper.toResponse(saved);
	}

	private void demoteCurrentPrimary(Long customerId, Long excludeContactId) {
		customerContactRepository.findByCustomerIdAndRole(customerId, ContactRole.PRIMARY)
				.filter(current -> excludeContactId == null || !current.getId().equals(excludeContactId))
				.ifPresent(current -> {
					current.setRole(ContactRole.SECONDARY);
					customerContactRepository.save(current);
				});
	}

	private void requireCustomerExists(Long customerId) {
		if (!customerRepository.existsById(customerId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay khach hang");
		}
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

	private Long currentUserId() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null
				|| !(authentication.getPrincipal() instanceof com.serviceops.security.CustomUserDetails details)) {
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
