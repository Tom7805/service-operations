package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.audit.AuditAction;
import com.serviceops.common.audit.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.common.exception.ResourceNotFoundException;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.exception.ResetTokenExpiredException;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.PasswordService;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hiện thực NCL-01-CN-008-CV-03 — xem phân tích nghiệp vụ (CV-01) đầy đủ tại
 * {@code docs/01-backlog/tasks/NCL-01-CN-008-doi-khoi-phuc-mat-khau.md}.
 *
 * <p>Chấm dứt "các phiên đăng nhập khác" (TC-01) được hiện thực bằng cách
 * tăng {@code User.tokenVersion}: mọi JWT phát hành trước thời điểm đổi mật
 * khẩu mang tokenVersion cũ nên bị {@link com.serviceops.common.security.JwtAuthenticationFilter}
 * từ chối ngay từ lần gọi kế tiếp, không cần kho lưu phiên tập trung.</p>
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
    private final AuditLogService auditLogService;

    @Value("${app.password-reset.token-ttl-minutes:30}")
    private long resetTokenTtlMinutes;

    @Override
    @Transactional
    public void changePassword(Long currentUserId, ChangePasswordReq request) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Mật khẩu hiện tại không đúng");
        }

        passwordPolicyValidator.validate(request.getNewPassword());

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.bumpTokenVersion();
        userRepository.save(user);

        auditLogService.record(user.getId(), user.getFullName(), AuditAction.CHANGE_PASSWORD,
                "User", user.getId(), "Người dùng tự đổi mật khẩu, các phiên đăng nhập khác đã bị chấm dứt");
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordReq request) {
        userRepository.findByEmailIgnoreCase(request.getEmail()).ifPresentOrElse(user -> {
            String rawToken = generateSecureToken();

            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setToken(rawToken);
            resetToken.setExpiresAt(Instant.now().plus(resetTokenTtlMinutes, ChronoUnit.MINUTES));
            passwordResetTokenRepository.save(resetToken);

            // Hệ thống chỉ chạy trên dữ liệu mô phỏng (QTN-04): "gửi email" ở đây là
            // ghi log liên kết khôi phục thay vì gọi dịch vụ email thật. Khi module
            // notification (NCL-14) sẵn sàng, thay lời gọi log.info bên dưới bằng
            // NotificationDispatcher để gửi qua kênh email thật.
            log.info("[MOCK EMAIL] Gửi liên kết khôi phục mật khẩu tới {} — token={} (hết hạn sau {} phút)",
                    user.getEmail(), rawToken, resetTokenTtlMinutes);

            auditLogService.record(user.getId(), user.getFullName(), AuditAction.FORGOT_PASSWORD_REQUEST,
                    "User", user.getId(), "Yêu cầu khôi phục mật khẩu, liên kết hết hạn sau "
                            + resetTokenTtlMinutes + " phút");
        }, () -> log.info("Yêu cầu khôi phục mật khẩu cho email không tồn tại: {} — bỏ qua để tránh "
                + "lộ thông tin tài khoản nào đang tồn tại trong hệ thống", request.getEmail()));
        // Cố ý không phân biệt "email không tồn tại" với "đã gửi liên kết" ra ngoài
        // API để tránh kẻ tấn công dò danh sách tài khoản hợp lệ.
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
                .orElseThrow(() -> new ResetTokenExpiredException(
                        "Liên kết khôi phục không hợp lệ, vui lòng gửi yêu cầu mới"));

        // NCL-01-CN-008-TC-02: đường dẫn đã quá hạn dùng hoặc đã được dùng trước đó.
        if (!resetToken.isUsable()) {
            throw new ResetTokenExpiredException(
                    "Đường dẫn khôi phục đã hết hạn, vui lòng gửi yêu cầu mới");
        }

        passwordPolicyValidator.validate(request.getNewPassword());

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.bumpTokenVersion();
        userRepository.save(user);

        resetToken.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(resetToken);

        auditLogService.record(user.getId(), user.getFullName(), AuditAction.RESET_PASSWORD,
                "User", user.getId(), "Khôi phục mật khẩu qua liên kết, các phiên đăng nhập khác đã bị chấm dứt");
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
