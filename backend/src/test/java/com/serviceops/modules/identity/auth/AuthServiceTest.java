package com.serviceops.modules.identity.auth;

import com.serviceops.modules.identity.auth.dto.request.LoginReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorChallengeRes;
import com.serviceops.modules.identity.auth.service.TwoFactorService;
import com.serviceops.modules.identity.auth.service.impl.AuthServiceImpl;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.LoginAttemptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	@Mock
	private UserRepository userRepository;

	@Mock
	private UserRoleScopeRepository userRoleScopeRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	@Mock
	private JwtProvider jwtProvider;

	@Mock
	private LoginAttemptService loginAttemptService;

	@Mock
	private TwoFactorService twoFactorService;

	private AuthServiceImpl authService;
	private User user;

	@BeforeEach
	void setUp() {
		authService = new AuthServiceImpl(userRepository, userRoleScopeRepository,
				passwordEncoder, jwtProvider, loginAttemptService, twoFactorService);

		user = new User();
		user.setId(1L);
		user.setUsername("nhanvien01");
		user.setPasswordHash("hashed-password");
		user.setFullName("Nhan vien");
		user.setStatus(UserStatus.ACTIVE);
	}

	@Test
	void login_roleBat2FA_traChallengeVaKhongCapJwt() {
		LoginReq request = new LoginReq();
		request.setUsername("nhanvien01");
		request.setPassword("Password@123");

		when(userRepository.findByUsername("nhanvien01")).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("Password@123", "hashed-password")).thenReturn(true);
		when(userRoleScopeRepository.findRoleCodesByUserId(1L)).thenReturn(List.of("VT-01"));
		when(twoFactorService.requiresTwoFactor(List.of("VT-01"))).thenReturn(true);
		when(twoFactorService.createChallenge(user))
				.thenReturn(new TwoFactorChallengeRes("challenge-token", false, null, null));

		LoginRes result = authService.login(request, "127.0.0.1");

		assertThat(result.isRequiresTwoFactor()).isTrue();
		assertThat(result.getChallengeToken()).isEqualTo("challenge-token");
		assertThat(result.getAccessToken()).isNull();
		verify(twoFactorService).createChallenge(user);
		verify(jwtProvider, never()).generateToken(any(), any(), any(), any(Integer.class));
	}
}
