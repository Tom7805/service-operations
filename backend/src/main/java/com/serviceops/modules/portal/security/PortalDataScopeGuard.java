package com.serviceops.modules.portal.security;

import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.portal.entity.PortalAccount;
import com.serviceops.modules.portal.repository.PortalAccountRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Pham vi du lieu cua cong khach hang (QTN-26): tai khoan cong chi thay du lieu cua CHINH khach hang ma
 * tai khoan duoc gan (NCL-13-CN-001).
 *
 * <p>Moi truy cap ngoai pham vi — ban ghi cua khach hang khac, ma khong ton tai, tai khoan VT-09 chua
 * duoc gan khach hang nao, tai khoan da bi khoa — deu nem {@link AccessDeniedException}:
 * {@code GlobalExceptionHandler} tra 403 va ghi Nhat ky "Tu choi truy cap" (TC-02). Khong phan biet
 * "khong ton tai" voi "cua nguoi khac" de khach hang khong do duoc ma ban ghi cua khach hang khac.</p>
 *
 * <p>Ho so da gop (NCL-02-CN-006): thao tac gop chuyen du lieu nghiep vu sang ho so giu lai, nhung tai khoan
 * cong va nguoi lien he van gan voi ho so cu. Vi vay pham vi gom ca "ho gop": ho so goc cua tai khoan, ho so ma
 * no da gop vao, va moi ho so da gop vao ho so do — deu la cung mot phap nhan.</p>
 */
@Component
@RequiredArgsConstructor
public class PortalDataScopeGuard {

	/** Chan vong lap neu du lieu merged_into_id bi hong (A -> B -> A). */
	private static final int MAX_MERGE_DEPTH = 20;

	private final PortalAccountRepository portalAccountRepository;
	private final UserRepository userRepository;
	private final CustomerRepository customerRepository;
	private final ProjectRepository projectRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	/** Pham vi cua tai khoan cong dang dang nhap. */
	public PortalScope currentScope() {
		Long userId = currentUserScopeProvider.currentUserId();
		if (userId == null) {
			throw new AccessDeniedException("Chua dang nhap cong khach hang");
		}
		PortalAccount account = portalAccountRepository.findByUserId(userId)
				.orElseThrow(() -> new AccessDeniedException("Tai khoan khong gan voi khach hang nao tren cong"));
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new AccessDeniedException("Khong tim thay tai khoan cong"));
		if (user.getStatus() != UserStatus.ACTIVE) {
			throw new AccessDeniedException("Tai khoan cong da bi khoa");
		}
		return new PortalScope(account.getId(), userId, user.getUsername(), user.getFullName(),
				account.getCustomerId(), Set.copyOf(resolveCustomerFamily(account.getCustomerId())));
	}

	/** Du an thuoc pham vi (TC-02 cua NCL-13-CN-002: mo du an cua khach hang khac bang duong dan truc tiep). */
	public Project requireProject(PortalScope scope, Long projectId) {
		Project project = projectId == null ? null : projectRepository.findById(projectId).orElse(null);
		if (project == null || !scope.owns(project.getCustomerId())) {
			throw new AccessDeniedException("Du an khong thuoc khach hang cua tai khoan cong");
		}
		return project;
	}

	public void requireCustomer(PortalScope scope, Long customerId) {
		if (!scope.owns(customerId)) {
			throw new AccessDeniedException("Ban ghi khong thuoc khach hang cua tai khoan cong");
		}
	}

	/**
	 * Ho so goc cua tai khoan, cac ho so no da gop vao (di len theo merged_into_id) va moi ho so da gop
	 * vao bat ky ho so nao trong so do (di xuong).
	 */
	Set<Long> resolveCustomerFamily(Long customerId) {
		Set<Long> family = new HashSet<>();
		Long current = customerId;
		for (int depth = 0; current != null && depth < MAX_MERGE_DEPTH && family.add(current); depth++) {
			current = customerRepository.findById(current).map(Customer::getMergedIntoId).orElse(null);
		}
		Deque<Long> frontier = new ArrayDeque<>(family);
		for (int depth = 0; !frontier.isEmpty() && depth < MAX_MERGE_DEPTH; depth++) {
			List<Customer> merged = customerRepository.findByMergedIntoIdIn(List.copyOf(frontier));
			frontier.clear();
			for (Customer customer : merged) {
				if (family.add(customer.getId())) {
					frontier.add(customer.getId());
				}
			}
		}
		return family;
	}

	/**
	 * @param customerId  khach hang duoc gan luc cap tai khoan
	 * @param customerIds khach hang duoc phep xem (gom ca ho so da gop — xem mo ta lop)
	 */
	public record PortalScope(Long accountId, Long userId, String username, String fullName, Long customerId,
			Set<Long> customerIds) {

		public boolean owns(Long anyCustomerId) {
			return anyCustomerId != null && customerIds.contains(anyCustomerId);
		}
	}
}
