package com.serviceops.modules.identity.auth;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.impl.PasswordServiceImpl;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test PasswordServiceImpl - cover TC-01 (doi mat khau), TC-02 (khoi phuc
 * mat khau) cua NCL-01-CN-008.
 */
@ExtendWith(MockitoExtension.class)
class PasswordServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private PasswordServiceImpl passwordService;

    private User user;

    @BeforeEach
    void setUp() {
        passwordService = new PasswordServiceImpl(userRepository, passwordResetTokenRepository,
                passwordEncoder, new PasswordPolicyValidator());
        ReflectionTestUtils.setField(passwordService, "resetTokenTtlMinutes", 30L);

        user = new User();
        user.setId(1L);
        user.setUsername("nhanvien01");
        user.setEmail("nhanvien01@service-operations.local");
        user.setPasswordHash("hashed-old-password");
        user.setTokenVersion(0);
    }

    @Test
    void changePassword_thanhCong_hashMoiVaTangTokenVersion() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("MatKhauCu1", "hashed-old-password")).thenReturn(true);
        when(passwordEncoder.matches("MatKhauMoi2", "hashed-old-password")).thenReturn(false);
        when(passwordEncoder.encode("MatKhauMoi2")).thenReturn("hashed-new-password");

        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("MatKhauCu1");
        req.setNewPassword("MatKhauMoi2");

        passwordService.changePassword(1L, req);

        assertThat(user.getPasswordHash()).isEqualTo("hashed-new-password");
        assertThat(user.getTokenVersion()).isEqualTo(1);
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_saiMatKhauHienTai_nemInvalidCredentials() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("SaiRoi1", "hashed-old-password")).thenReturn(false);

        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("SaiRoi1");
        req.setNewPassword("MatKhauMoi2");

        assertThatThrownBy(() -> passwordService.changePassword(1L, req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_CREDENTIALS);
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_matKhauMoiKhongDatChinhSach_nemValidationError() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("MatKhauCu1", "hashed-old-password")).thenReturn(true);

        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("MatKhauCu1");
        req.setNewPassword("short");

        assertThatThrownBy(() -> passwordService.changePassword(1L, req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void changePassword_matKhauMoiTrungMatKhauCu_nemValidationError() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("MatKhauCu1", "hashed-old-password")).thenReturn(true);
        when(passwordEncoder.matches("MatKhauCu1", "hashed-old-password")).thenReturn(true);

        ChangePasswordReq req = new ChangePasswordReq();
        req.setCurrentPassword("MatKhauCu1");
        req.setNewPassword("MatKhauCu1");

        assertThatThrownBy(() -> passwordService.changePassword(1L, req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void forgotPassword_emailTonTai_taoTokenVaKhongNemLoi() {
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail(user.getEmail());

        passwordService.forgotPassword(req);

        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
    }

    @Test
    void forgotPassword_emailKhongTonTai_khongNemLoiVaKhongTaoToken() {
        when(userRepository.findByEmailIgnoreCase("khongton@service-operations.local")).thenReturn(Optional.empty());

        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail("khongton@service-operations.local");

        passwordService.forgotPassword(req);

        verify(passwordResetTokenRepository, never()).save(any());
    }

    @Test
    void resetPassword_tokenHetHan_nemResetTokenInvalid() {
        PasswordResetToken expiredToken = new PasswordResetToken();
        expiredToken.setUser(user);
        expiredToken.setToken("expired-token");
        expiredToken.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(passwordResetTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(expiredToken));

        ResetPasswordReq req = new ResetPasswordReq();
        req.setToken("expired-token");
        req.setNewPassword("MatKhauMoi2");

        assertThatThrownBy(() -> passwordService.resetPassword(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RESET_TOKEN_INVALID);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_tokenHopLe_datLaiMatKhauVaDanhDauDaDung() {
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setToken("valid-token");
        token.setExpiresAt(LocalDateTime.now().plusMinutes(30));

        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("MatKhauMoi2")).thenReturn("hashed-new-password");

        ResetPasswordReq req = new ResetPasswordReq();
        req.setToken("valid-token");
        req.setNewPassword("MatKhauMoi2");

        passwordService.resetPassword(req);

        assertThat(user.getPasswordHash()).isEqualTo("hashed-new-password");
        assertThat(user.getTokenVersion()).isEqualTo(1);
        assertThat(token.getUsedAt()).isNotNull();
        verify(passwordResetTokenRepository).save(token);
    }

    @Test
    void isResetTokenValid_tokenDaDung_traVeFalse() {
        PasswordResetToken usedToken = new PasswordResetToken();
        usedToken.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        usedToken.setUsedAt(LocalDateTime.now());

        when(passwordResetTokenRepository.findByToken("used-token")).thenReturn(Optional.of(usedToken));

        assertThat(passwordService.isResetTokenValid("used-token")).isFalse();
    }
}
