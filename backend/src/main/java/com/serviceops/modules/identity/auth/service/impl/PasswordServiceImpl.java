package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.PasswordService;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * NCL-01-CN-008 — đổi mật khẩu (đang đăng nhập) và khôi phục mật khẩu (quên
 * mật khẩu → liên kết mô phỏng qua log → đặt lại).
 *
 * <p>TC-01 "chấm dứt các phiên đăng nhập khác" được hiện thực bằng cách tăng
 * {@link User#bumpTokenVersion()}: mọi JWT phát hành trước đó mang tokenVersion
 * cũ nên bị {@link com.serviceops.security.JwtAuthFilter} từ chối ngay từ lần
 * gọi kế tiếp — kể cả token của chính request đang đổi mật khẩu, nên client
 * cần điều hướng người dùng về màn hình đăng nhập sau khi đổi/khôi phục thành
 * công (xem docs/04-api/api-contract.md).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordServiceImpl implements PasswordService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final PasswordResetNotifier passwordResetNotifier;

    @Value("${app.password-reset.token-ttl-minutes:30}")
    private long resetTokenTtlMinutes;

    @Override
    @Transactional
    public void changePassword(Long currentUserId, ChangePasswordReq request) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay nguoi dung"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(ErrorCode.INVALID_CREDENTIALS, "Mat khau hien tai khong dung");
        }

        passwordPolicyValidator.validate(request.getNewPassword());

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Mat khau moi phai khac mat khau hien tai");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.bumpTokenVersion();
        userRepository.save(user);

        log.info("PASSWORD_CHANGED userId={} username={}", user.getId(), user.getUsername());
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordReq request) {
        userRepository.findByEmailIgnoreCase(request.getEmail()).ifPresentOrElse(user -> {
            String rawToken = generateSecureToken();

            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            // Chi luu BAN BAM. Token tho khong duoc luu o dau ngoai lien ket gui
            // cho dung nguoi dung do — xem V31__hash_password_reset_tokens.sql.
            resetToken.setTokenHash(hashToken(rawToken));
            resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(resetTokenTtlMinutes));
            passwordResetTokenRepository.save(resetToken);

            // Chuyen lien ket qua kenh cua moi truong dang chay: moi truong phat
            // trien in ra log rieng, moi truong that gui thu qua SMTP.
            // TUYET DOI KHONG ghi token vao log o day. Truoc day dong nay la
            //   log.info("[MOCK EMAIL] ... token={}", ..., rawToken, ...)
            // va no dong nghia voi: ai doc duoc log la doi duoc mat khau bat ky ai.
            passwordResetNotifier.sendResetLink(user, rawToken, resetTokenTtlMinutes);

            log.info("FORGOT_PASSWORD_REQUESTED userId={} username={}", user.getId(), user.getUsername());
        }, () -> log.info("FORGOT_PASSWORD_REQUESTED email khong ton tai - bo qua de tranh lo thong tin tai khoan"));
        // Co y khong phan biet "email khong ton tai" voi "da gui lien ket" ra ngoai API
        // de tranh ke tan cong do danh sach tai khoan hop le.
        //
        // Va cung khong ghi chinh dia chi email vao log o nhanh "khong ton tai":
        // nhanh do nhan MOI chuoi ai do go vao o nhap, nen no bien log thanh mot
        // bai chua dia chi email tuy y — vua la rui ro du lieu ca nhan, vua cho phep
        // ke tan cong bom du lieu vao log cua he thong.
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isResetTokenValid(String token) {
        return passwordResetTokenRepository.findByTokenHash(hashToken(token))
                .map(PasswordResetToken::isUsable)
                .orElse(false);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordReq request) {
        // Bam chuoi nguoi dung gui len roi tra cuu theo ban bam. CSDL khong he
        // biet token tho, nen doc duoc bang nay cung khong dat lai duoc mat khau.
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenHash(hashToken(request.getToken()))
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESET_TOKEN_INVALID,
                        "Lien ket khoi phuc khong hop le, vui long gui yeu cau moi"));

        // NCL-01-CN-008-TC-02: duong dan da qua han dung hoac da duoc dung truoc do.
        if (!resetToken.isUsable()) {
            throw new BusinessRuleException(ErrorCode.RESET_TOKEN_INVALID,
                    "Duong dan khoi phuc da het han, vui long gui yeu cau moi");
        }

        passwordPolicyValidator.validate(request.getNewPassword());

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.bumpTokenVersion();
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        log.info("PASSWORD_RESET userId={} username={}", user.getId(), user.getUsername());
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Bam token bang SHA-256, tra ve chuoi hex 64 ky tu.
     *
     * <p>Vi sao khong dung bcrypt/argon2 nhu voi mat khau: hai bai toan khac
     * nhau. Mat khau do NGUOI DUNG chon nen co the doan hoac do tu dien, vi vay
     * can mot ham bam CO Y LAM CHAM. Token nay la 32 byte ngau nhien tu
     * {@link SecureRandom} — khong gian 2^256, khong the do. Ham bam cham chi
     * lam tang chi phi may chu ma khong them chut an toan nao.</p>
     *
     * <p>Cung vi cung ly do do ma khong can "muoi" (salt): muoi de chong bang
     * tra cuu dung san cho cac gia tri hay gap, con day moi token la duy nhat va
     * ngau nhien.</p>
     */
    private String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            // SHA-256 la thuat toan BAT BUOC co trong moi ban Java, nen nhanh nay
            // khong bao gio chay. Neu chay that thi he thong dang hong nang.
            throw new IllegalStateException("Moi truong Java thieu SHA-256", ex);
        }
    }
}
