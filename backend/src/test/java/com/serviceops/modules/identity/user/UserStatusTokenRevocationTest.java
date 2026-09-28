package com.serviceops.modules.identity.user;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.user.dto.request.UserStatusReq;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.identity.user.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * NCL-01-CN-002: khoa tai khoan phai cham dut ngay cac phien dang mo (tang tokenVersion) — JwtAuthFilter chi chap
 * nhan token cung phien ban. Mo khoa khong tang (nguoi dung dang nhap lai binh thuong).
 */
@ExtendWith(MockitoExtension.class)
class UserStatusTokenRevocationTest {

	@Mock private UserRepository userRepository;
	@Mock private UserRoleScopeRepository userRoleScopeRepository;
	@Mock private RoleRepository roleRepository;
	@Mock private DepartmentRepository departmentRepository;
	@Mock private PasswordEncoder passwordEncoder;
	@Mock private AuditLogService auditLogService;

	@InjectMocks private UserServiceImpl service;

	private User user;

	@BeforeEach
	void setUp() {
		user = new User();
		user.setId(7L);
		user.setUsername("nv01");
		user.setFullName("Nhan vien");
		user.setPasswordHash("x");
		when(userRepository.findById(7L)).thenReturn(Optional.of(user));
		lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
		lenient().when(userRoleScopeRepository.findByUser_Id(7L)).thenReturn(List.of());
	}

	@Test
	@DisplayName("Khoa tai khoan -> tokenVersion tang, token da phat hanh mat hieu luc")
	void lockRevokesIssuedTokens() {
		user.setStatus(UserStatus.ACTIVE);

		service.updateStatus(7L, new UserStatusReq(UserStatus.LOCKED));

		assertThat(user.getStatus()).isEqualTo(UserStatus.LOCKED);
		assertThat(user.getTokenVersion()).isEqualTo(1);
	}

	@Test
	@DisplayName("Mo khoa tai khoan -> khong tang tokenVersion, xoa dem dang nhap sai")
	void unlockKeepsTokenVersion() {
		user.setStatus(UserStatus.LOCKED);
		user.setFailedLoginAttempts(5);

		service.updateStatus(7L, new UserStatusReq(UserStatus.ACTIVE));

		assertThat(user.getTokenVersion()).isZero();
		assertThat(user.getFailedLoginAttempts()).isZero();
	}
}
