package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.PasswordService;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
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
            resetToken.setToken(rawToken);
            resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(resetTokenTtlMinutes));
            passwordResetTokenRepository.save(resetToken);

            // QTN-04: he thong chi dung du lieu mo phong - "gui email" o day la ghi log
            // lien ket khoi phuc thay vi goi dich vu email that.
            log.info("[MOCK EMAIL] Gui lien ket khoi phuc mat khau toi {} - token={} (het han sau {} phut)",
                    user.getEmail(), rawToken, resetTokenTtlMinutes);
            log.info("FORGOT_PASSWORD_REQUESTED userId={} username={}", user.getId(), user.getUsername());
        }, () -> log.info("FORGOT_PASSWORD_REQUESTED email khong ton tai: {} - bo qua de tranh lo thong tin tai khoan",
                request.getEmail()));
        // Co y khong phan biet "email khong ton tai" voi "da gui lien ket" ra ngoai API
        // de tranh ke tan cong do danh sach tai khoan hop le.
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isResetTokenValid(String token) {
        return passwordResetTokenRepository.findByToken(token)
                .map(PasswordResetToken::isUsable)
                .orElse(false);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordReq request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
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
}
