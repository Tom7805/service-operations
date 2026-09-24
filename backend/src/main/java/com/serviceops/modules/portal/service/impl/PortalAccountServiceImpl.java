package com.serviceops.modules.portal.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerContact;
import com.serviceops.modules.customer.enums.ContactRole;
import com.serviceops.modules.customer.enums.CustomerStatus;
import com.serviceops.modules.customer.repository.CustomerContactRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.entity.UserRoleScope;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.portal.dto.request.PortalAccountCreateReq;
import com.serviceops.modules.portal.dto.request.PortalAccountStatusReq;
import com.serviceops.modules.portal.dto.response.PortalAccountRes;
import com.serviceops.modules.portal.dto.response.PortalContactCandidateRes;
import com.serviceops.modules.portal.entity.PortalAccount;
import com.serviceops.modules.portal.mapper.PortalMapper;
import com.serviceops.modules.portal.repository.PortalAccountRepository;
import com.serviceops.modules.portal.service.PortalAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-13-CN-001: cap tai khoan cong cho nguoi lien he cua khach hang.
 *
 * <ul>
 *   <li>TC-01: tao tai khoan dang nhap (vai tro VT-09, pham vi SELF, ngoai cay to chuc) va gan co dinh voi
 *       dung khach hang cua nguoi lien he — moi nguoi lien he toi da mot tai khoan.</li>
 *   <li>TC-02: khoa tai khoan khi nguoi lien he nghi viec — tang {@code tokenVersion} de cac phien dang
 *       mo mat hieu luc ngay; khong xoa du lieu nao (tai khoan, lich su xac nhan nghiem thu giu nguyen).</li>
 *   <li>TC-03: chi Quan tri vien (chan o controller); TC-04: moi thay doi ghi Nhat ky he thong (PORTAL).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PortalAccountServiceImpl implements PortalAccountService {

	static final String PORTAL_ROLE_CODE = "VT-09";

	private final PortalAccountRepository portalAccountRepository;
	private final CustomerContactRepository contactRepository;
	private final CustomerRepository customerRepository;
	private final UserRepository userRepository;
	private final RoleRepository roleRepository;
	private final UserRoleScopeRepository userRoleScopeRepository;
	private final PasswordEncoder passwordEncoder;
	private final PasswordPolicyValidator passwordPolicyValidator;
	private final PortalMapper mapper;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public List<PortalContactCandidateRes> listCandidates(Long customerId) {
		if (!customerRepository.existsById(customerId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
					"Khong tim thay khach hang voi id=" + customerId);
		}
		List<CustomerContact> contacts = contactRepository.findByCustomerId(customerId);
		Map<Long, PortalAccount> accountByContact = portalAccountRepository.findByCustomerIdOrderByIdDesc(customerId)
				.stream().collect(Collectors.toMap(PortalAccount::getContactId, Function.identity(), (a, b) -> a));
		Map<Long, User> users = byId(userRepository.findAllById(accountByContact.values().stream()
				.map(PortalAccount::getUserId).toList()), User::getId);
		return contacts.stream()
				.sorted(Comparator.comparing((CustomerContact contact) -> contact.getRole() != ContactRole.PRIMARY)
						.thenComparing(CustomerContact::getId))
				.map(contact -> {
					PortalAccount account = accountByContact.get(contact.getId());
					User user = account == null ? null : users.get(account.getUserId());
					return new PortalContactCandidateRes(contact.getId(), contact.getFullName(), contact.getTitle(),
							contact.getEmail(), contact.getRole(), account == null ? null : account.getId(),
							user == null ? null : user.getUsername(), user == null ? null : user.getStatus());
				})
				.toList();
	}

	@Override
	public PortalAccountRes create(PortalAccountCreateReq request) {
		CustomerContact contact = contactRepository.findById(request.contactId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay nguoi lien he voi id=" + request.contactId()));
		Customer customer = customerRepository.findById(contact.getCustomerId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay khach hang cua nguoi lien he"));
		if (customer.getStatus() == CustomerStatus.MERGED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Ho so " + customer.getCode()
					+ " da duoc gop vao ho so khac, hay cap tai khoan tu nguoi lien he cua ho so giu lai");
		}
		if (portalAccountRepository.existsByContactId(contact.getId())) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Nguoi lien he " + contact.getFullName() + " da duoc cap tai khoan cong");
		}
		String username = request.username().trim();
		if (userRepository.existsByUsernameIgnoreCase(username)) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Ten dang nhap " + username + " da ton tai");
		}
		String email = blankToNull(contact.getEmail());
		if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Email " + email
					+ " cua nguoi lien he da thuoc mot tai khoan khac, hay cap nhat email nguoi lien he truoc");
		}
		passwordPolicyValidator.validate(request.password());
		Role portalRole = roleRepository.findByCode(PORTAL_ROLE_CODE)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Chua khai bao vai tro Khach hang (" + PORTAL_ROLE_CODE + ")"));

		User user = new User();
		user.setUsername(username);
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		user.setFullName(contact.getFullName());
		user.setEmail(email);
		user.setDepartmentId(null);
		user.setStatus(UserStatus.ACTIVE);
		user = userRepository.save(user);

		UserRoleScope scope = new UserRoleScope();
		scope.setUser(user);
		scope.setRole(portalRole);
		scope.setScopeType(DataScopeType.SELF.name());
		userRoleScopeRepository.save(scope);

		LocalDateTime now = LocalDateTime.now(clock);
		PortalAccount account = new PortalAccount();
		account.setUserId(user.getId());
		account.setCustomerId(customer.getId());
		account.setContactId(contact.getId());
		account.setCreatedBy(currentUsername());
		account.setCreatedAt(now);
		account.setUpdatedAt(now);
		account = portalAccountRepository.save(account);

		log.info("PORTAL_ACCOUNT_CREATED accountId={} userId={} customerId={} contactId={}",
				account.getId(), user.getId(), customer.getId(), contact.getId());
		auditLogService.record("Cấp tài khoản cổng khách hàng", AuditTargetType.PORTAL, account.getId(),
				"Tài khoản cổng " + user.getUsername(),
				"Cap tai khoan cong " + user.getUsername() + " cho nguoi lien he " + contact.getFullName()
						+ " cua khach hang " + customer.getCode() + " - " + customer.getName());
		return mapper.toAccountRes(account, user, customer, contact);
	}

	@Override
	@Transactional(readOnly = true)
	public List<PortalAccountRes> search(Long customerId, UserStatus status) {
		List<PortalAccount> accounts = customerId == null
				? portalAccountRepository.findAllByOrderByIdDesc()
				: portalAccountRepository.findByCustomerIdOrderByIdDesc(customerId);
		if (accounts.isEmpty()) {
			return List.of();
		}
		Map<Long, User> users = byId(userRepository.findAllById(ids(accounts, PortalAccount::getUserId)), User::getId);
		Map<Long, Customer> customers = byId(customerRepository.findAllById(ids(accounts, PortalAccount::getCustomerId)),
				Customer::getId);
		Map<Long, CustomerContact> contacts = byId(contactRepository.findAllById(ids(accounts, PortalAccount::getContactId)),
				CustomerContact::getId);
		return accounts.stream()
				.filter(account -> status == null || (users.get(account.getUserId()) != null
						&& users.get(account.getUserId()).getStatus() == status))
				.map(account -> mapper.toAccountRes(account, users.get(account.getUserId()),
						customers.get(account.getCustomerId()), contacts.get(account.getContactId())))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public PortalAccountRes get(Long accountId) {
		return toResponse(requireAccount(portalAccountRepository.findById(accountId), accountId));
	}

	@Override
	public PortalAccountRes updateStatus(Long accountId, PortalAccountStatusReq request) {
		if (request.status() != UserStatus.ACTIVE && request.status() != UserStatus.LOCKED) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Tai khoan cong chi co hai trang thai ACTIVE (mo) hoac LOCKED (khoa)");
		}
		PortalAccount account = requireAccount(portalAccountRepository.findByIdForUpdate(accountId), accountId);
		User user = userRepository.findById(account.getUserId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay tai khoan dang nhap cua tai khoan cong"));
		UserStatus previous = user.getStatus();
		if (previous == request.status()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, request.status() == UserStatus.LOCKED
					? "Tai khoan cong " + user.getUsername() + " da bi khoa"
					: "Tai khoan cong " + user.getUsername() + " dang hoat dong");
		}

		boolean locking = request.status() == UserStatus.LOCKED;
		user.setStatus(request.status());
		if (locking) {
			// Cham dut ngay cac phien dang mo: JwtAuthFilter chi chap nhan token co cung tokenVersion.
			user.bumpTokenVersion();
		} else {
			user.setFailedLoginAttempts(0);
			user.setLockedUntil(null);
		}
		userRepository.save(user);

		LocalDateTime now = LocalDateTime.now(clock);
		String reason = blankToNull(request.reason());
		account.setStatusReason(reason);
		account.setStatusChangedBy(currentUsername());
		account.setStatusChangedAt(now);
		account.setUpdatedAt(now);
		account = portalAccountRepository.save(account);

		log.info("PORTAL_ACCOUNT_STATUS_CHANGED accountId={} userId={} {} -> {}",
				account.getId(), user.getId(), previous, request.status());
		auditLogService.record(locking ? "Khóa tài khoản cổng khách hàng" : "Mở khóa tài khoản cổng khách hàng",
				AuditTargetType.PORTAL, account.getId(), "Tài khoản cổng " + user.getUsername(),
				"Doi trang thai tai khoan cong " + user.getUsername() + " tu " + previous + " sang "
						+ request.status() + (reason == null ? "" : ", ly do: " + reason));
		return toResponse(account);
	}

	private PortalAccountRes toResponse(PortalAccount account) {
		return mapper.toAccountRes(account,
				userRepository.findById(account.getUserId()).orElse(null),
				customerRepository.findById(account.getCustomerId()).orElse(null),
				contactRepository.findById(account.getContactId()).orElse(null));
	}

	private PortalAccount requireAccount(Optional<PortalAccount> account, Long accountId) {
		return account.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
				"Khong tim thay tai khoan cong voi id=" + accountId));
	}

	private static List<Long> ids(List<PortalAccount> accounts, Function<PortalAccount, Long> getter) {
		return accounts.stream().map(getter).filter(Objects::nonNull).distinct().toList();
	}

	private static <T> Map<Long, T> byId(List<T> values, Function<T, Long> idGetter) {
		return values.stream().collect(Collectors.toMap(idGetter, Function.identity()));
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private static String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
