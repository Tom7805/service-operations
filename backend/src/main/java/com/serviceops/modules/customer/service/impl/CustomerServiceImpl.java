package com.serviceops.modules.customer.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.CustomerSearchReq;
import com.serviceops.modules.customer.dto.request.CustomerSegmentReq;
import com.serviceops.modules.customer.dto.request.CustomerUpdateReq;
import com.serviceops.modules.customer.dto.request.DuplicateOverrideReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.enums.CustomerStatus;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerDuplicateOverrideLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerDuplicateService;
import com.serviceops.modules.customer.service.CustomerService;
import com.serviceops.modules.customer.validator.CustomerDuplicateValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
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
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final UserRepository userRepository;
	private final AuditLogService systemAuditLogService;

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
		// Nguoi tao mac dinh la nguoi phu trach (QTN-01) — dung de tinh pham vi
		// DEPARTMENT/SELF khi liet ke, xem findAll().
		customer.setOwnerId(currentUserScopeProvider.currentUserId());
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
		String industry = normalizeKeyword(request == null ? null : request.getIndustry());
		String companySize = normalizeKeyword(request == null ? null : request.getCompanySize());
		String priority = normalizeKeyword(request == null ? null : request.getPriority());
		return customerRepository.findAllByOrderByCreatedAtDesc().stream()
				.filter(this::inCurrentScope)
				.filter(customer -> keyword == null || matchesKeyword(customer, keyword))
				.filter(customer -> industry == null || equalsIgnoreCase(customer.getIndustry(), industry))
				.filter(customer -> companySize == null || equalsIgnoreCase(customer.getCompanySize(), companySize))
				.filter(customer -> priority == null || equalsIgnoreCase(customer.getPriority(), priority))
				.map(customerMapper::toResponse)
				.toList();
	}

	/**
	 * QTN-01: khach hang chi hien voi nguoi xem co pham vi bao trum "nguoi phu
	 * trach" ({@code ownerId}) cua ho so do.
	 *
	 * <p>COMPANY luon qua. DEPARTMENT: phong ban cua khach hang duoc suy GIAN
	 * TIEP tu {@code users.department_id} cua chinh chu so huu tai thoi diem
	 * goi (khong luu lap lai o customers) — vi vay khi chu so huu doi phong
	 * ban, pham vi cap nhat ngay theo, khong con du lieu cu. SELF: chi hien
	 * ho so do CHINH nguoi xem phu trach. Ho so khong xac dinh ownerId (du
	 * lieu cu nhap tay/import khong khop tai khoan nao — xem migration V34)
	 * bi loai khoi ca hai truong hop DEPARTMENT lan SELF, an toan hon la lo
	 * nham cho nguoi khong lien quan.</p>
	 */
	private boolean inCurrentScope(Customer customer) {
		UserScope scope = currentUserScopeProvider.currentScope();
		if (scope.isCompanyWide()) {
			return true;
		}
		if (customer.getOwnerId() == null) {
			return false;
		}
		if (scope.type() == DataScopeType.SELF) {
			return customer.getOwnerId().equals(currentUserScopeProvider.currentUserId());
		}
		if (scope.type() == DataScopeType.DEPARTMENT) {
			Long ownerDepartmentId = ownerDepartmentId(customer.getOwnerId());
			return ownerDepartmentId != null && scope.departmentIds().contains(ownerDepartmentId);
		}
		return false;
	}

	private Long ownerDepartmentId(Long ownerId) {
		return userRepository.findById(ownerId).map(User::getDepartmentId).orElse(null);
	}

	@Override
	public CustomerRes updateSegment(Long customerId, CustomerSegmentReq request) {
		Customer customer = customerRepository.findById(customerId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so khach hang"));
		customer.setIndustry(request.industry().trim());
		customer.setCompanySize(request.companySize().trim());
		customer.setPriority(request.priority().trim());
		Customer saved = customerRepository.save(customer);
		recordAudit(saved.getId(), CustomerAuditAction.SEGMENT_UPDATE,
				"Cap nhat phan nhom: nganh=" + saved.getIndustry()
						+ ", quy mo=" + saved.getCompanySize() + ", uu tien=" + saved.getPriority());
		return customerMapper.toResponse(saved);
	}

	@Override
	public CustomerRes update(Long customerId, CustomerUpdateReq request) {
		Customer customer = loadEditableCustomer(customerId);
		String name = request.name().trim();
		if (name.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ten khach hang khong duoc de trong");
		}

		// Chay lai chong trung nhu luong tao moi, nhung loai CHINH ho so dang sua ra khoi ket qua.
		List<DuplicateCandidateRes> candidates =
				customerDuplicateService.findDuplicates(name, request.taxCode(), request.phone()).stream()
						.filter(candidate -> !customerId.equals(candidate.id()))
						.toList();
		customerDuplicateValidator.validate(candidates);

		applyEditableFields(customer, request);
		Customer saved = customerRepository.save(customer);
		recordAudit(saved.getId(), CustomerAuditAction.UPDATE,
				"Cap nhat ho so: ten=" + saved.getName() + ", mst=" + saved.getTaxCode()
						+ ", sdt=" + saved.getPhone());
		log.info("CUSTOMER_UPDATED code={} customerId={} by={}", saved.getCode(), saved.getId(),
				currentUserScopeProvider.currentUserId());
		return customerMapper.toResponse(saved);
	}

	@Override
	public CustomerRes updateWithOverride(Long customerId, CustomerUpdateReq request,
			DuplicateOverrideReq override) {
		customerDuplicateValidator.validateOverrideReason(override.reason());
		Customer customer = loadEditableCustomer(customerId);
		String name = request.name().trim();
		if (name.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ten khach hang khong duoc de trong");
		}

		applyEditableFields(customer, request);
		Customer saved = customerRepository.save(customer);

		CustomerDuplicateOverrideLog audit = new CustomerDuplicateOverrideLog();
		audit.setCustomerId(saved.getId());
		audit.setReason(override.reason().trim());
		audit.setOverriddenByUserId(currentUserScopeProvider.currentUserId());
		overrideLogRepository.save(audit);

		recordAudit(saved.getId(), CustomerAuditAction.UPDATE_WITH_OVERRIDE,
				"Chinh sua ho so bo qua canh bao trung. Ly do: " + override.reason().trim());
		log.info("CUSTOMER_UPDATED_WITH_OVERRIDE code={} customerId={} by={}", saved.getCode(),
				saved.getId(), currentUserScopeProvider.currentUserId());
		return customerMapper.toResponse(saved);
	}

	/** Tai ho so de chinh sua; chan neu khong ton tai hoac da bi gop (NCL-02-CN-006). */
	private Customer loadEditableCustomer(Long customerId) {
		Customer customer = customerRepository.findById(customerId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so khach hang"));
		if (customer.getStatus() == CustomerStatus.MERGED) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ho so da bi gop, khong the chinh sua");
		}
		return customer;
	}

	private void applyEditableFields(Customer customer, CustomerUpdateReq request) {
		customer.setName(request.name().trim());
		customer.setTaxCode(blankToNull(request.taxCode()));
		customer.setPhone(blankToNull(request.phone()));
		customer.setIndustry(blankToNull(request.industry()));
		customer.setAddress(blankToNull(request.address()));
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
		audit.setOverriddenByUserId(currentUserScopeProvider.currentUserId());
		overrideLogRepository.save(audit);

		recordAudit(saved.getId(), CustomerAuditAction.CREATE_WITH_OVERRIDE,
				"Tao ho so moi bo qua canh bao trung. Ly do: " + override.reason().trim());

		log.info("CUSTOMER_CREATED_WITH_OVERRIDE code={} customerId={} by={}", saved.getCode(),
			saved.getId(), currentUserScopeProvider.currentUserId());
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
		customer.setOwnerId(currentUserScopeProvider.currentUserId());
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

	private boolean equalsIgnoreCase(String value, String expected) {
		return value != null && value.trim().equalsIgnoreCase(expected);
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}

	private void recordAudit(Long customerId, CustomerAuditAction action, String detail) {
		CustomerAuditLog log = new CustomerAuditLog();
		log.setCustomerId(customerId);
		log.setActionType(action);
		log.setDetail(detail);
		log.setActorUserId(currentUserScopeProvider.currentUserId());
		log.setActorUsername(currentUsername());
		auditLogRepository.save(log);

		// Ghi vao Nhat ky he thong tong hop (/audit-logs) — luu ben vung, chi VT-07 xem duoc.
		String customerName = customerRepository.findById(customerId).map(Customer::getName).orElse(null);
		systemAuditLogService.record(action.displayLabel(), AuditTargetType.CUSTOMER, customerId, customerName, detail);
	}
}
