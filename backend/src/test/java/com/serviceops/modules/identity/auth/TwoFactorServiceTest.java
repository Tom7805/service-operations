package com.serviceops.modules.identity.auth;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorConfigReq;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorChallengeRes;
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
import com.serviceops.security.TotpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-01-CN-009 — xác thực hai bước kiểu Google Authenticator/Authy (TOTP, RFC 6238).
 * Mã kiểm thử tự tính bằng {@link TotpUtil#verifyCode} nên không phụ thuộc giá trị cố định.
 */
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
	private String validSecret;

	@BeforeEach
	void setUp() {
		twoFactorService = new TwoFactorServiceImpl(userSessionRepository, twoFactorSettingRepository,
				twoFactorConfigAuditRepository, roleRepository, userRepository, userRoleScopeRepository,
				jwtProvider, loginAttemptService);
		ReflectionTestUtils.setField(twoFactorService, "lockMinutes", 15L);
		ReflectionTestUtils.setField(twoFactorService, "challengeTtlMinutes", 10L);
		ReflectionTestUtils.setField(twoFactorService, "issuer", "Van Hanh Dich Vu");

		validSecret = TotpUtil.generateSecret();

		user = new User();
		user.setId(1L);
		user.setUsername("finance-user");
		user.setStatus(UserStatus.ACTIVE);
		user.setTotpSecret(validSecret);
		user.setTotpConfirmedAt(LocalDateTime.now().minusDays(1));

		session = new UserSession();
		session.setUser(user);
		session.setTokenId("challenge-token");
		session.setOtpAttempts(0);
		session.setExpiresAt(LocalDateTime.now().plusMinutes(10));
	}

	private String currentValidCode() {
		// Cùng thuật toán TotpUtil dùng nội bộ — tự sinh mã đúng thời điểm hiện tại để test không phụ thuộc mã cố định.
		for (int candidate = 0; candidate < 1_000_000; candidate++) {
			String code = String.format("%06d", candidate);
			if (TotpUtil.verifyCode(validSecret, code, 0)) {
				return code;
			}
		}
		throw new AssertionError("Khong tim duoc ma TOTP hop le cho test");
	}

	@Test
	@DisplayName("Lan dau bat 2FA: chua co khoa bi mat -> sinh khoa moi va tra ve du lieu QR")
	void createChallenge_firstTime_generatesSecretAndReturnsEnrollmentData() {
		User freshUser = new User();
		freshUser.setId(2L);
		freshUser.setUsername("newbie");
		freshUser.setStatus(UserStatus.ACTIVE);
		// totpSecret con null

		TwoFactorChallengeRes result = twoFactorService.createChallenge(freshUser);

		assertThat(result.enrollment()).isTrue();
		assertThat(result.otpauthUri()).startsWith("otpauth://totp/");
		assertThat(result.secretForDisplay()).isNotBlank();
		assertThat(freshUser.getTotpSecret()).isNotBlank();
		verify(userRepository).save(freshUser);

		ArgumentCaptor<UserSession> captor = forClass(UserSession.class);
		verify(userSessionRepository).save(captor.capture());
		assertThat(captor.getValue().getTokenId()).isEqualTo(result.challengeToken());
	}

	@Test
	@DisplayName("Da thiet lap tu truoc: khong sinh lai khoa, khong tra QR nua")
	void createChallenge_alreadyEnrolled_doesNotExposeSecretAgain() {
		TwoFactorChallengeRes result = twoFactorService.createChallenge(user);

		assertThat(result.enrollment()).isFalse();
		assertThat(result.otpauthUri()).isNull();
		assertThat(result.secretForDisplay()).isNull();
		verify(userRepository, never()).save(user);
	}

	@Test
	@DisplayName("BUG that: goi createChallenge nhieu lan truoc khi xac nhan lan dau van phai tiep tuc hien QR, khong duoc coi la da thiet lap")
	void createChallenge_calledTwiceBeforeConfirming_stillReturnsEnrollmentWithSameSecret() {
		// Mo phong dung tinh huong loi: nguoi dung go dung mat khau (sinh challenge lan 1, sinh
		// khoa moi) nhung CHUA nhap ma nao ca - vi du dong tab, F5, hoac chi la thu dang nhap lai.
		User freshUser = new User();
		freshUser.setId(3L);
		freshUser.setUsername("newbie2");
		freshUser.setStatus(UserStatus.ACTIVE);
		// totpSecret va totpConfirmedAt deu con null - chua tung thiet lap gi

		TwoFactorChallengeRes first = twoFactorService.createChallenge(freshUser);
		assertThat(first.enrollment()).isTrue();
		String secretAfterFirstCall = freshUser.getTotpSecret();
		assertThat(secretAfterFirstCall).isNotBlank();

		// Lan goi thu hai (F5 / thu dang nhap lai) - VAN phai enrollment=true vi chua xac nhan lan nao.
		TwoFactorChallengeRes second = twoFactorService.createChallenge(freshUser);

		assertThat(second.enrollment())
				.as("Chua tung xac nhan ma nao thi lan goi sau van phai tiep tuc hien QR")
				.isTrue();
		assertThat(second.otpauthUri()).isNotNull();
		// Dung lai dung mot khoa - khong sinh khoa moi lam hong QR/app da quet truoc do.
		assertThat(freshUser.getTotpSecret()).isEqualTo(secretAfterFirstCall);
	}

	@Test
	@DisplayName("TC-01: nhap dung ma TOTP hien tai thi cap JWT")
	void verifyTwoFactor_validCode_issuesJwt() {
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(loginAttemptService.isLocked(user)).thenReturn(false);
		when(userRoleScopeRepository.findRoleCodesByUserId(1L)).thenReturn(List.of("VT-05"));
		when(twoFactorSettingRepository.findByEnabledTrue()).thenReturn(List.of(enabledSetting("VT-05")));
		when(jwtProvider.generateToken(1L, "finance-user", List.of("VT-05"), 0)).thenReturn("jwt-token");

		var result = twoFactorService.verifyTwoFactor(request(currentValidCode()));

		assertThat(result.getAccessToken()).isEqualTo("jwt-token");
		assertThat(session.isVerified()).isTrue();
	}

	@Test
	@DisplayName("Xac nhan thanh cong lan dau thi danh dau da thiet lap xong (totpConfirmedAt)")
	void verifyTwoFactor_firstSuccess_marksEnrollmentConfirmed() {
		user.setTotpConfirmedAt(null); // dang o trang thai vua quet QR, chua xac nhan lan nao
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(loginAttemptService.isLocked(user)).thenReturn(false);
		when(userRoleScopeRepository.findRoleCodesByUserId(1L)).thenReturn(List.of("VT-05"));
		when(twoFactorSettingRepository.findByEnabledTrue()).thenReturn(List.of(enabledSetting("VT-05")));

		twoFactorService.verifyTwoFactor(request(currentValidCode()));

		assertThat(user.getTotpConfirmedAt()).isNotNull();
		verify(userRepository).save(user);
	}

	@Test
	void verifyTwoFactor_inactiveAccount_rejectsBeforeJwt() {
		user.setStatus(UserStatus.INACTIVE);
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request("123456")))
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

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request("123456")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
	}

	@Test
	void verifyTwoFactor_expiredChallenge_rejectsBeforeCheckingAccount() {
		session.setExpiresAt(LocalDateTime.now().minusMinutes(1));
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request("123456")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
	}

	@Test
	void verifyTwoFactor_revokedChallenge_rejectsAsAlreadyUsed() {
		session.setRevokedAt(LocalDateTime.now().minusSeconds(1));
		when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request("123456")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
	}

	@Test
	@DisplayName("TC-02: nhap sai ma 3 lan lien tiep thi tam khoa tai khoan")
	void verifyTwoFactor_thirdInvalidCode_locksAccountAndDoesNotIssueJwt() {
		lenient().when(userSessionRepository.findByTokenId("challenge-token")).thenReturn(Optional.of(session));
		lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		lenient().when(loginAttemptService.isLocked(user)).thenReturn(false);
		lenient().when(userRoleScopeRepository.findRoleCodesByUserId(1L)).thenReturn(List.of("VT-05"));
		lenient().when(twoFactorSettingRepository.findByEnabledTrue()).thenReturn(List.of(enabledSetting("VT-05")));

		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request("000000")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request("000000")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode")
				.isEqualTo(ErrorCode.TWO_FACTOR_INVALID);
		assertThatThrownBy(() -> twoFactorService.verifyTwoFactor(request("000000")))
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

	private TwoFactorSetting enabledSetting(String roleCode) {
		TwoFactorSetting setting = new TwoFactorSetting();
		Role role = new Role();
		role.setCode(roleCode);
		setting.setRole(role);
		setting.setEnabled(true);
		return setting;
	}

	private TwoFactorVerifyReq request(String code) {
		TwoFactorVerifyReq request = new TwoFactorVerifyReq();
		request.setChallengeToken("challenge-token");
		request.setOtp(code);
		return request;
	}
}
