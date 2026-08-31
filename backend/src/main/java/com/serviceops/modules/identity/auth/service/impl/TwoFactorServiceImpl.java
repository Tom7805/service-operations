package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorConfigReq;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorChallengeRes;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorSetupRes;
import com.serviceops.modules.identity.auth.entity.TwoFactorSetting;
import com.serviceops.modules.identity.auth.entity.TwoFactorConfigAudit;
import com.serviceops.modules.identity.auth.entity.UserSession;
import com.serviceops.modules.identity.auth.repository.TwoFactorConfigAuditRepository;
import com.serviceops.modules.identity.auth.repository.TwoFactorSettingRepository;
import com.serviceops.modules.identity.auth.repository.UserSessionRepository;
import com.serviceops.modules.identity.auth.service.TwoFactorService;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.LoginAttemptService;
import com.serviceops.security.TotpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

/**
 * NCL-01-CN-009 — xác thực hai bước (2FA) kiểu Google Authenticator/Authy cho
 * tài khoản xem dữ liệu tài chính.
 *
 * <p>Luồng: (1) {@code requiresTwoFactor} quyết định user có thuộc vai trò đang
 * bật 2FA không; nếu có, (2) {@code createChallenge} tạo phiên chờ — lần đầu sẽ
 * sinh khóa bí mật TOTP mới và trả kèm dữ liệu vẽ QR để người dùng quét bằng app
 * Authenticator (thiết lập một lần), các lần sau chỉ tạo phiên chờ nhập mã hiện
 * tại trên app; (3) {@code verifyTwoFactor} tính mã TOTP đúng thời điểm và so
 * khớp — đúng thì cấp JWT, đồng thời xác nhận thiết lập xong nếu đây là lần
 * đầu (TC-01).</p>
 *
 * <p>TC-02: nhập sai mã 3 lần liên tiếp → khóa tạm đăng nhập và ghi cảnh báo
 * cho quản trị viên (qua log). TC-03: chỉ quản trị viên đổi cấu hình
 * (ràng buộc ở tầng controller). TC-04: {@code updateConfig} lưu người thực hiện
 * và thời điểm.</p>
 *
 * <p>Khóa bí mật TOTP không bao giờ rời khỏi server sau lần thiết lập (chỉ trả
 * về đúng một lần lúc {@code enrollment}); mã 6 số không lưu trữ ở đâu cả — tính
 * lại theo giờ hệ thống mỗi lần kiểm (BE-SEC).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TwoFactorServiceImpl implements TwoFactorService {

	public static final int MAX_OTP_ATTEMPTS = 3;
	/** Cho phép lệch 1 chu kỳ (±30s) mỗi hướng để bù đồng hồ điện thoại không khớp tuyệt đối với máy chủ. */
	private static final int TOTP_DRIFT_STEPS = 1;
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final UserSessionRepository userSessionRepository;
	private final TwoFactorSettingRepository twoFactorSettingRepository;
	private final TwoFactorConfigAuditRepository twoFactorConfigAuditRepository;
	private final RoleRepository roleRepository;
	private final UserRepository userRepository;
	private final UserRoleScopeRepository userRoleScopeRepository;
	private final JwtProvider jwtProvider;
	private final LoginAttemptService loginAttemptService;

	@Value("${app.two-factor.challenge-ttl-minutes:10}")
	private long challengeTtlMinutes;

	@Value("${app.two-factor.lock-minutes:15}")
	private long lockMinutes;

	@Value("${app.two-factor.issuer:Van Hanh Dich Vu}")
	private String issuer;

	@Override
	@Transactional(readOnly = true)
	public boolean requiresTwoFactor(List<String> roleCodes) {
		if (roleCodes == null || roleCodes.isEmpty()) {
			return false;
		}
		List<String> enabledRoleCodes = twoFactorSettingRepository.findByEnabledTrue().stream()
				.map(setting -> setting.getRole().getCode())
				.toList();
		return roleCodes.stream().anyMatch(enabledRoleCodes::contains);
	}

	@Override
	@Transactional
	public TwoFactorChallengeRes createChallenge(User user) {
		String tokenId = generateSecureToken();
		// "Chưa thiết lập xong" phải xét theo totpConfirmedAt (đã nhập đúng mã lần đầu chưa), KHÔNG
		// phải theo totpSecret còn null hay không: secret được sinh ngay ở lần bấm "Đăng nhập" đầu
		// tiên (trước khi người dùng kịp quét QR/xác nhận gì cả); nếu xét theo secret thì chỉ cần
		// người dùng thử đăng nhập 2 lần (kể cả lần đầu chưa quét xong) là lần sau đã bị coi là
		// "đã thiết lập" và mất luôn màn hình QR dù chưa từng liên kết app nào.
		boolean isFirstSetup = user.getTotpConfirmedAt() == null;

		if (isFirstSetup && user.getTotpSecret() == null) {
			// Chỉ sinh khóa mới khi CHƯA có sẵn — còn nếu đã có (lần trước sinh ra nhưng chưa xác
			// nhận xong) thì dùng lại đúng khóa đó, để nếu người dùng đã lỡ quét QR cũ, mã trên app
			// vẫn tiếp tục đúng thay vì bị đổi khóa ngầm mỗi lần thử lại.
			user.setTotpSecret(TotpUtil.generateSecret());
			userRepository.save(user);
		}

		UserSession session = new UserSession();
		session.setUser(user);
		session.setTokenId(tokenId);
		session.setOtpAttempts(0);
		session.setExpiresAt(LocalDateTime.now().plusMinutes(challengeTtlMinutes));
		userSessionRepository.save(session);

		log.info("TWO_FACTOR_CHALLENGE_CREATED user={} challenge={} enrollment={}",
				user.getUsername(), tokenId, isFirstSetup);

		if (!isFirstSetup) {
			return new TwoFactorChallengeRes(tokenId, false, null, null);
		}

		String otpauthUri = TotpUtil.buildOtpAuthUri(user.getTotpSecret(), user.getUsername(), issuer);
		return new TwoFactorChallengeRes(tokenId, true, otpauthUri, TotpUtil.formatForDisplay(user.getTotpSecret()));
	}

	@Override
	@Transactional
	public LoginRes verifyTwoFactor(TwoFactorVerifyReq request) {
		UserSession session = userSessionRepository.findByTokenId(request.getChallengeToken())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.TWO_FACTOR_INVALID,
						"Ma xac thuc khong hop le, vui long dang nhap lai"));

		if (session.isVerified() || session.getRevokedAt() != null) {
			throw new BusinessRuleException(ErrorCode.TWO_FACTOR_INVALID,
					"Ma xac thuc da duoc su dung, vui long dang nhap lai");
		}

		if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
			throw new BusinessRuleException(ErrorCode.TWO_FACTOR_INVALID,
					"Phien xac thuc da het han, vui long dang nhap lai");
		}

		User user = userRepository.findById(session.getUser().getId())
			.orElseThrow(() -> new BusinessRuleException(ErrorCode.TWO_FACTOR_INVALID,
				"Tai khoan khong con ton tai, vui long dang nhap lai"));
		if (user.getStatus() != UserStatus.ACTIVE) {
			throw new BusinessRuleException(ErrorCode.ACCOUNT_INACTIVE,
				"Tai khoan khong con duoc phep dang nhap");
		}
		if (loginAttemptService.isLocked(user)) {
			throw new BusinessRuleException(ErrorCode.ACCOUNT_LOCKED,
				"Tai khoan dang tam khoa, vui long thu lai sau");
		}

		List<String> currentRoles = userRoleScopeRepository.findRoleCodesByUserId(user.getId());
		if (!requiresTwoFactor(currentRoles)) {
			throw new BusinessRuleException(ErrorCode.TWO_FACTOR_INVALID,
				"Chinh sach xac thuc hai buoc da thay doi, vui long dang nhap lai");
		}

		if (user.getTotpSecret() == null || !TotpUtil.verifyCode(user.getTotpSecret(), request.getOtp(), TOTP_DRIFT_STEPS)) {
			session.setOtpAttempts(session.getOtpAttempts() + 1);

			if (session.getOtpAttempts() >= MAX_OTP_ATTEMPTS) {
				// TC-02: nhap sai 3 lan lien tiep -> tam khoa dang nhap va canh bao quan tri vien.
				loginAttemptService.lockForTwoFactor(user, lockMinutes);

				log.warn("TWO_FACTOR_MAX_ATTEMPTS userId={} username={} - tam khoa dang nhap. Canh bao quan tri vien (TC-02).",
						user.getId(), user.getUsername());

				throw new BusinessRuleException(ErrorCode.ACCOUNT_LOCKED,
						"Nhap sai ma xac thuc qua so lan cho phep. Tai khoan tam khoa, vui long thu lai sau.");
			}

			userSessionRepository.save(session);
			throw new BusinessRuleException(ErrorCode.TWO_FACTOR_INVALID, "Ma xac thuc khong dung");
		}

		// Dung ma -> danh dau phien da su dung, xac nhan thiet lap (neu la lan dau) va cap JWT.
		session.setVerifiedAt(LocalDateTime.now());
		session.setRevokedAt(LocalDateTime.now());
		userSessionRepository.save(session);

		if (user.getTotpConfirmedAt() == null) {
			user.setTotpConfirmedAt(LocalDateTime.now());
			userRepository.save(user);
			log.info("TWO_FACTOR_ENROLLED userId={} username={} - da lien ket app Authenticator", user.getId(), user.getUsername());
		}

		log.info("TWO_FACTOR_VERIFIED userId={} username={}", session.getUser().getId(), session.getUser().getUsername());

		return issueLoginRes(user, currentRoles);
	}

	@Override
	@Transactional
	public void resetEnrollment(Long userId, Long performedByUserId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay tai khoan"));

		user.setTotpSecret(null);
		user.setTotpConfirmedAt(null);
		userRepository.save(user);
		// Khong can thu hoi rieng cac phien cho dang do: verifyTwoFactor da bat buoc
		// user.getTotpSecret() != null moi tinh ma, nen phien cu (neu con) tu dong vo hieu.

		String performedByUsername = performedByUserId != null
				? userRepository.findById(performedByUserId).map(User::getUsername).orElse(null)
				: null;
		log.warn("TWO_FACTOR_ENROLLMENT_RESET userId={} username={} by={} - yeu cau lien ket lai app Authenticator",
				user.getId(), user.getUsername(), performedByUsername);
	}

	@Override
	@Transactional(readOnly = true)
	public List<TwoFactorSetupRes> listConfigs() {
		return roleRepository.findAll().stream()
				.map(this::toSetupRes)
				.toList();
	}

	@Override
	@Transactional
	public TwoFactorSetupRes updateConfig(Long roleId, TwoFactorConfigReq request, Long updatedByUserId) {
		Role role = roleRepository.findById(roleId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay vai tro"));

		TwoFactorSetting setting = twoFactorSettingRepository.findByRole_Id(roleId).orElseGet(() -> {
			TwoFactorSetting s = new TwoFactorSetting();
			s.setRole(role);
			return s;
		});

		boolean previousEnabled = setting.isEnabled();
		boolean newEnabled = Boolean.TRUE.equals(request.getEnabled());
		setting.setEnabled(newEnabled);
		User updater = updatedByUserId != null
				? userRepository.findById(updatedByUserId).orElse(null)
				: null;
		setting.setUpdatedBy(updater);
		twoFactorSettingRepository.save(setting);

		TwoFactorConfigAudit audit = new TwoFactorConfigAudit();
		audit.setRoleId(role.getId());
		audit.setRoleCode(role.getCode());
		audit.setUpdatedByUserId(updatedByUserId);
		audit.setUpdatedByUsername(updater != null ? updater.getUsername() : null);
		audit.setPreviousEnabled(previousEnabled);
		audit.setNewEnabled(newEnabled);
		audit.setChangedAt(LocalDateTime.now());
		twoFactorConfigAuditRepository.save(audit);

		log.info("TWO_FACTOR_CONFIG roleCode={} enabled={} updatedBy={} (TC-04)",
				role.getCode(), setting.isEnabled(),
				updater != null ? updater.getUsername() : null);

		return toSetupRes(role, setting);
	}

	private LoginRes issueLoginRes(User user, List<String> roles) {
		String token = jwtProvider.generateToken(user.getId(), user.getUsername(), roles, user.getTokenVersion());
		return new LoginRes(token, "Bearer", user.getId(), user.getUsername(), user.getFullName(), roles);
	}

	private TwoFactorSetupRes toSetupRes(Role role) {
		return toSetupRes(role, twoFactorSettingRepository.findByRole_Id(role.getId()).orElse(null));
	}

	private TwoFactorSetupRes toSetupRes(Role role, TwoFactorSetting setting) {
		boolean enabled = setting != null && setting.isEnabled();
		String updatedBy = setting != null && setting.getUpdatedBy() != null
				? setting.getUpdatedBy().getUsername()
				: null;
		LocalDateTime updatedAt = setting != null ? setting.getUpdatedAt() : null;
		return new TwoFactorSetupRes(role.getId(), role.getCode(), role.getName(), enabled, updatedBy, updatedAt);
	}

	private String generateSecureToken() {
		byte[] bytes = new byte[32];
		SECURE_RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}
}
