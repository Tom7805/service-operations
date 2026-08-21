package com.serviceops.modules.identity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.exception.ResetTokenExpiredException;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.PasswordService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

/**
 * Kiểm chứng end-to-end (dùng H2, không mock) luồng đổi và khôi phục mật khẩu
 * hiện thực trong {@code PasswordServiceImpl} cho NCL-01-CN-008-CV-03.
 *
 * <p>Đây là test bổ sung để tự xác minh khi triển khai — không thay thế bộ
 * test chính thức của task BE-QA (NCL-01-CN-008-CV-06), file đó
 * ({@code PasswordServiceTest.java}) vẫn để trống cho người phụ trách.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class PasswordFlowIntegrationTest {

    @Autowired
    private PasswordService passwordService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private User user;

    @BeforeEach
    void setUp() {
        passwordResetTokenRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setFullName("Nguyễn Văn A");
        user.setEmail("a@example.com");
        user.setPasswordHash(passwordEncoder.encode("MatKhauCu123"));
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);
    }

    @Test
    void doiMatKhau_thanhCong_seTangTokenVersionVaCapNhatHash() {
        int tokenVersionTruoc = user.getTokenVersion();

        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("MatKhauCu123");
        req.setNewPassword("MatKhauMoi456");

        passwordService.changePassword(user.getId(), req);

        User sau = userRepository.findById(user.getId()).orElseThrow();
        assertThat(sau.getTokenVersion()).isEqualTo(tokenVersionTruoc + 1);
        assertThat(passwordEncoder.matches("MatKhauMoi456", sau.getPasswordHash())).isTrue();
    }

    @Test
    void doiMatKhau_saiMatKhauHienTai_biTuChoi() {
        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("sai_mat_khau");
        req.setNewPassword("MatKhauMoi456");

        assertThatThrownBy(() -> passwordService.changePassword(user.getId(), req))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void khoiPhucMatKhau_luongDayDu_tuQuenToiDatLaiThanhCong() {
        ForgotPasswordReq forgotReq = new ForgotPasswordReq();
        forgotReq.setEmail(user.getEmail());
        passwordService.forgotPassword(forgotReq);

        PasswordResetToken token = passwordResetTokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(passwordService.isResetTokenValid(token.getToken())).isTrue();

        ResetPasswordReq resetReq = new ResetPasswordReq();
        resetReq.setToken(token.getToken());
        resetReq.setNewPassword("MatKhauKhoiPhuc789");
        passwordService.resetPassword(resetReq);

        User sau = userRepository.findById(user.getId()).orElseThrow();
        assertThat(passwordEncoder.matches("MatKhauKhoiPhuc789", sau.getPasswordHash())).isTrue();
        assertThat(passwordService.isResetTokenValid(token.getToken())).isFalse();
    }

    @Test
    void khoiPhucMatKhau_lienKetDaHetHan_biTuChoi_TC02() {
        PasswordResetToken expired = new PasswordResetToken();
        expired.setUser(user);
        expired.setToken("token-het-han");
        expired.setExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES));
        passwordResetTokenRepository.save(expired);

        assertThat(passwordService.isResetTokenValid("token-het-han")).isFalse();

        ResetPasswordReq resetReq = new ResetPasswordReq();
        resetReq.setToken("token-het-han");
        resetReq.setNewPassword("MatKhauMoi999");

        assertThatThrownBy(() -> passwordService.resetPassword(resetReq))
                .isInstanceOf(ResetTokenExpiredException.class);
    }

    @Test
    void khoiPhucMatKhau_emailKhongTonTai_khongNemLoi_khongTaoToken() {
        ForgotPasswordReq forgotReq = new ForgotPasswordReq();
        forgotReq.setEmail("khong-ton-tai@example.com");

        passwordService.forgotPassword(forgotReq);

        assertThat(passwordResetTokenRepository.findAll()).isEmpty();
    }
}
