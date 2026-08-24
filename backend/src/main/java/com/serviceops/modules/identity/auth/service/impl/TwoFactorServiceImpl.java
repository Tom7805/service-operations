package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorConfigReq;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

/**
 * NCL-01-CN-009 — xác thực hai bước (2FA) cho tài khoản xem dữ liệu tài chính.
 *
 * <p>Luồng: (1) {@code requiresTwoFactor} quyết định user có thuộc vai trò đang
 * bật 2FA không; nếu có, (2) {@code createChallenge} sinh phiên chờ OTP và mã một
 * lần (lưu hash, gửi qua kênh mô phỏng), (3) {@code verifyTwoFactor} xác thực mã
 * và cấp JWT (TC-01).</p>
 *
 * <p>TC-02: nhập sai mã 3 lần liên tiếp → khóa tạm đăng nhập và ghi cảnh báo
 * cho quản trị viên (qua log). TC-03: chỉ quản trị viên đổi cấu hình
 * (ràng buộc ở tầng controller). TC-04: {@code updateConfig} lưu người thực hiện
 * và thời điểm.</p>
 *
 * <p>OTP chỉ lưu dạng SHA-256, có hạn dùng và dùng được một lần (BE-SEC).
 * Việc "gửi mã" được mô phỏng bằng log theo QTN-04.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TwoFactorServiceImpl implements TwoFactorService {

    public static final int MAX_OTP_ATTEMPTS = 3;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserSessionRepository userSessionRepository;
    private final TwoFactorSettingRepository twoFactorSettingRepository;
    private final TwoFactorConfigAuditRepository twoFactorConfigAuditRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final JwtProvider jwtProvider;
    private final LoginAttemptService loginAttemptService;

    @Value("${app.two-factor.otp-ttl-minutes:5}")
    private long otpTtlMinutes;

    @Value("${app.two-factor.lock-minutes:15}")
    private long lockMinutes;

    @Value("${app.two-factor.mock-otp-logging:false}")
    private boolean mockOtpLogging;

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
    public String createChallenge(User user) {
        String rawOtp = generateOtp();
        String tokenId = generateSecureToken();

        UserSession session = new UserSession();
        session.setUser(user);
        session.setTokenId(tokenId);
        session.setOtpHash(hashOtp(rawOtp));
        session.setOtpExpiresAt(LocalDateTime.now().plusMinutes(otpTtlMinutes));
        session.setOtpAttempts(0);
        session.setExpiresAt(LocalDateTime.now().plusMinutes(otpTtlMinutes));
        userSessionRepository.save(session);

        if (mockOtpLogging) {
            log.info("[MOCK OTP] user={} challenge={} otp={} (het han sau {} phut)",
                user.getUsername(), tokenId, rawOtp, otpTtlMinutes);
        } else {
            log.info("TWO_FACTOR_CHALLENGE_CREATED user={} challenge={} (otp delivery handled externally)",
                user.getUsername(), tokenId);
        }

        return tokenId;
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

        if (session.isOtpExpired()) {
            throw new BusinessRuleException(ErrorCode.TWO_FACTOR_INVALID,
                    "Ma xac thuc da het han, vui long dang nhap lai de gui ma moi");
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

        if (!hashOtp(request.getOtp()).equals(session.getOtpHash())) {
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

        // Dung ma -> danh dau da su dung va cap JWT.
        session.setVerifiedAt(LocalDateTime.now());
        session.setRevokedAt(LocalDateTime.now());
        userSessionRepository.save(session);

        log.info("TWO_FACTOR_VERIFIED userId={} username={}", session.getUser().getId(), session.getUser().getUsername());

        return issueLoginRes(user, currentRoles);
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

    private String generateOtp() {
        int otp = SECURE_RANDOM.nextInt(1_000_000);
        return String.format("%06d", otp);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(otp.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 khong kha dung", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}