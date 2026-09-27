package com.serviceops.modules.portal;

import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.portal.entity.PortalAccount;
import com.serviceops.modules.portal.repository.PortalAccountRepository;
import com.serviceops.modules.portal.security.PortalDataScopeGuard;
import com.serviceops.modules.portal.security.PortalDataScopeGuard.PortalScope;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/** QTN-26: pham vi du lieu cua tai khoan cong khach hang. */
@ExtendWith(MockitoExtension.class)
class PortalDataScopeGuardTest {

	private static final long USER_ID = 90L;
	private static final long CUSTOMER_ID = 1001L;

	@Mock private PortalAccountRepository portalAccountRepository;
	@Mock private UserRepository userRepository;
	@Mock private CustomerRepository customerRepository;
	@Mock private ProjectRepository projectRepository;
	@Mock private CurrentUserScopeProvider currentUserScopeProvider;

	@InjectMocks private PortalDataScopeGuard guard;

	@BeforeEach
	void setUp() {
		lenient().when(currentUserScopeProvider.currentUserId()).thenReturn(USER_ID);
		lenient().when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer(CUSTOMER_ID, null)));
		lenient().when(customerRepository.findByMergedIntoIdIn(anyCollection())).thenReturn(List.of());
	}

	@Test
	@DisplayName("Tai khoan cong hop le -> pham vi chi gom khach hang duoc gan")
	void scopeOfActiveAccount() {
		givenAccount(UserStatus.ACTIVE);

		PortalScope scope = guard.currentScope();

		assertThat(scope.customerId()).isEqualTo(CUSTOMER_ID);
		assertThat(scope.customerIds()).containsExactly(CUSTOMER_ID);
		assertThat(scope.fullName()).isEqualTo("Nguyen Thi Nhi");
	}

	@Test
	@DisplayName("NCL-13-CN-001-TC-02: tai khoan da khoa -> khong con truy cap cong (ke ca voi token cu)")
	void lockedAccountDenied() {
		givenAccount(UserStatus.LOCKED);
		assertThatThrownBy(() -> guard.currentScope()).isInstanceOf(AccessDeniedException.class);
	}

	@Test
	@DisplayName("Tai khoan VT-09 chua gan khach hang / chua dang nhap -> tu choi")
	void noPortalAccountDenied() {
		when(portalAccountRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> guard.currentScope()).isInstanceOf(AccessDeniedException.class);

		when(currentUserScopeProvider.currentUserId()).thenReturn(null);
		assertThatThrownBy(() -> guard.currentScope()).isInstanceOf(AccessDeniedException.class);
	}

	@Test
	@DisplayName("NCL-13-CN-002-TC-02: du an cua khach hang khac hoac khong ton tai -> tu choi nhu nhau")
	void projectOutsideScopeDenied() {
		PortalScope scope = new PortalScope(1L, USER_ID, "nhi", "Nhi", CUSTOMER_ID, Set.of(CUSTOMER_ID));
		Project own = project(10L, CUSTOMER_ID);
		Project foreign = project(11L, 2002L);
		when(projectRepository.findById(10L)).thenReturn(Optional.of(own));
		when(projectRepository.findById(11L)).thenReturn(Optional.of(foreign));
		when(projectRepository.findById(12L)).thenReturn(Optional.empty());

		assertThat(guard.requireProject(scope, 10L)).isSameAs(own);
		assertThatThrownBy(() -> guard.requireProject(scope, 11L)).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> guard.requireProject(scope, 12L)).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> guard.requireProject(scope, null)).isInstanceOf(AccessDeniedException.class);
		assertThatThrownBy(() -> guard.requireCustomer(scope, 2002L)).isInstanceOf(AccessDeniedException.class);
	}

	@Test
	@DisplayName("Ho so da gop (NCL-02-CN-006): pham vi gom ho so giu lai va moi ho so da gop vao, khong lan sang khach khac")
	void mergedFamilyIncluded() {
		// 1001 da gop vao 1000; 1003 da gop vao 1000; 1004 da gop vao 1003.
		when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer(CUSTOMER_ID, 1000L)));
		when(customerRepository.findById(1000L)).thenReturn(Optional.of(customer(1000L, null)));
		when(customerRepository.findByMergedIntoIdIn(anyCollection())).thenAnswer(invocation -> {
			Collection<?> targets = invocation.getArgument(0);
			if (targets.contains(1000L)) {
				return List.of(customer(CUSTOMER_ID, 1000L), customer(1003L, 1000L));
			}
			if (targets.contains(1003L)) {
				return List.of(customer(1004L, 1003L));
			}
			return List.of();
		});
		givenAccount(UserStatus.ACTIVE);

		assertThat(guard.currentScope().customerIds()).containsExactlyInAnyOrder(1000L, CUSTOMER_ID, 1003L, 1004L);
	}

	private void givenAccount(UserStatus status) {
		PortalAccount account = new PortalAccount();
		account.setId(5L);
		account.setUserId(USER_ID);
		account.setCustomerId(CUSTOMER_ID);
		account.setContactId(7L);
		when(portalAccountRepository.findByUserId(USER_ID)).thenReturn(Optional.of(account));
		User user = new User();
		user.setId(USER_ID);
		user.setUsername("nhi");
		user.setFullName("Nguyen Thi Nhi");
		user.setStatus(status);
		when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
	}

	private static Customer customer(Long id, Long mergedIntoId) {
		Customer customer = new Customer();
		customer.setId(id);
		customer.setMergedIntoId(mergedIntoId);
		return customer;
	}

	private static Project project(Long id, Long customerId) {
		Project project = new Project();
		project.setId(id);
		project.setCustomerId(customerId);
		return project;
	}
}
