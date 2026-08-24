package com.serviceops.modules.identity.auth;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorConfigReq;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.entity.TwoFactorConfigAudit;
import com.serviceops.modules.identity.auth.entity.UserSession;
import com.serviceops.modules.identity.auth.entity.TwoFactorSetting;
import com.serviceops.modules.identity.auth.repository.TwoFactorSettingRepository;
import com.serviceops.modules.identity.auth.repository.TwoFactorConfigAuditRepository;
import com.serviceops.modules.identity.auth.repository.UserSessionRepository;
import com.serviceops.modules.identity.auth.service.impl.TwoFactorServiceImpl;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.LoginAttemptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TwoFactorServiceTest {

	@Mock
	private UserSessionRepository userSessionRepository;

	@Mock
	private TwoFactorSettingRepository twoFactorSettingRepository;

	@Mock
	private TwoFactorConfigAuditRepository twoFactorConfigAuditRepository;

	@Mock
	private RoleRepository roleRepository;

	@Mock
	private UserRepository userRepository;

	@Mock
	private UserRoleScopeRepository userRoleScopeRepository;

	@Mock
	private JwtProvider jwtProvider;

	@Mock
	private LoginAttemptService loginAttemptService;

	private TwoFactorServiceImpl twoFactorService;
	private UserSession session;
	private User user;

	@BeforeEach
	void setUp() {
		twoFactorService = new TwoFactorServiceImpl(userSessionRepository, twoFactorSettingRepository,
				twoFactorConfigAuditRepository, roleRepository, userRepository, userRoleScopeRepository,
				jwtProvider, loginAttemptService);
		ReflectionTestUtils.setField(twoFactorService, "lockMinutes", 15L);
		ReflectionTestUtils.setField(twoFactorService, "otpTtlMinutes", 5L);

		user = new User();
		user.setId(1L);
		user.setUsername("finance-user");
		user.setStatus(UserStatus.ACTIVE);

		session = new UserSession();
		session.setUser(user);
		session.setTokenId("challenge-token");
		session.setOtpHash("otp-hash");
		session.setOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
		session.setExpiresAt(LocalDateTime.now().plusMinutes(5));
	}

	@Test
	void verifyTwoFactor_inactiveAccount_rejectsBeforeJwt() {
		user.setStatus(UserStatus.INACTIVE);
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.ACCOUNT_INACTIVE);
	}

	@Test
	void verifyTwoFactor_twoFactorDisabledForCurrentRoles_rejects() {
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(loginAttemptService.isLocked(user)).thenReturn(false);
		when(userRoleScopeRepository.findRoleCodesByUserId(1L)).thenReturn(List.of("VT-01"));
		when(twoFactorSettingRepository.findByEnabledTrue()).thenReturn(List.of());

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
	}

	@Test
	void verifyTwoFactor_expiredOtp_rejectsBeforeCheckingAccount() {
		session.setOtpExpiresAt(LocalDateTime.now().minusMinutes(1));
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
	}

	@Test
	void verifyTwoFactor_revokedChallenge_rejectsAsAlreadyUsed() {
		session.setRevokedAt(LocalDateTime.now().minusSeconds(1));
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
	}

	@Test
	void verifyTwoFactor_thirdInvalidOtp_locksAccountAndDoesNotIssueJwt() {
		TwoFactorSetting setting = new TwoFactorSetting();
		Role role = new Role();
		role.setCode("VT-01");
		setting.setRole(role);
		setting.setEnabled(true);

		session.setOtpHash(sha256("654321"));
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(loginAttemptService.isLocked(user)).thenReturn(false);
		when(userRoleScopeRepository.findRoleCodesByUserId(1L)).thenReturn(List.of("VT-01"));
		when(twoFactorSettingRepository.findByEnabledTrue()).thenReturn(List.of(setting));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.ACCOUNT_LOCKED);

		verify(loginAttemptService).lockForTwoFactor(user, 15L);
	}

	@Test
	void updateConfig_persistsBeforeAndAfterStateAudit() {
		Role role = new Role();
		role.setId(7L);
		role.setCode("VT-05");
		role.setName("Ke toan");
		User updater = new User();
		updater.setId(9L);
		updater.setUsername("admin");
		TwoFactorConfigReq request = new TwoFactorConfigReq();
		request.setEnabled(true);

		when(roleRepository.findById(7L)).thenReturn(Optional.of(role));
		when(twoFactorSettingRepository.findByRole_Id(7L)).thenReturn(Optional.empty());
		when(userRepository.findById(9L)).thenReturn(Optional.of(updater));

		twoFactorService.updateConfig(7L, request, 9L);

		var captor = forClass(TwoFactorConfigAudit.class);
		verify(twoFactorConfigAuditRepository).save(captor.capture());
		TwoFactorConfigAudit audit = captor.getValue();
		assertThat(audit.getRoleId()).isEqualTo(7L);
		assertThat(audit.getRoleCode()).isEqualTo("VT-05");
		assertThat(audit.getUpdatedByUserId()).isEqualTo(9L);
		assertThat(audit.getUpdatedByUsername()).isEqualTo("admin");
		assertThat(audit.isPreviousEnabled()).isFalse();
		assertThat(audit.isNewEnabled()).isTrue();
		assertThat(audit.getChangedAt()).isNotNull();
	}

	private TwoFactorVerifyReq request() {
		TwoFactorVerifyReq request = new TwoFactorVerifyReq();
		request.setChallengeToken("challenge-token");
		request.setOtp("123456");
		return request;
	}

	private String sha256(String value) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256")
					.digest(value.getBytes(StandardCharsets.UTF_8));
			StringBuilder result = new StringBuilder();
			for (byte item : digest) {
				result.append(String.format("%02x", item));
			}
			return result.toString();
		} catch (Exception exception) {
			throw new AssertionError(exception);
		}
	}
}
