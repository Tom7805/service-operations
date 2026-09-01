package com.serviceops.modules.identity.auth;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.impl.PasswordServiceImpl;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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

    @Mock
    private PasswordResetNotifier passwordResetNotifier;

    private PasswordServiceImpl passwordService;

    private User user;

    /** SHA-256 hex — ban sao doc lap cua cach ma service bam token. */
    private static String sha256Hex(String raw) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(d.length * 2);
            for (byte b : d) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @BeforeEach
    void setUp() {
        passwordService = new PasswordServiceImpl(userRepository, passwordResetTokenRepository,
                passwordEncoder, new PasswordPolicyValidator(), passwordResetNotifier);
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

    /**
     * Test QUAN TRONG NHAT cua lop nay: CSDL khong duoc giu token tho.
     *
     * <p>Bat ca hai dau: chuoi luu vao CSDL, va chuoi trao cho kenh gui. Roi
     * khang dinh chung KHAC nhau, va chuoi luu dung bang SHA-256 cua chuoi gui.</p>
     *
     * <p>Neu mot ngay nao do co nguoi "don dep" bang cach luu thang token tho cho
     * tien tra cuu, test nay do ngay.</p>
     */
    @Test
    void forgotPassword_luuBanBam_khongLuuTokenTho() {
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail(user.getEmail());

        passwordService.forgotPassword(req);

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(saved.capture());

        ArgumentCaptor<String> sentRaw = ArgumentCaptor.forClass(String.class);
        verify(passwordResetNotifier).sendResetLink(eq(user), sentRaw.capture(), eq(30L));

        String rawToken = sentRaw.getValue();
        String storedHash = saved.getValue().getTokenHash();

        assertThat(rawToken).isNotBlank();
        assertThat(storedHash)
                .as("CSDL phai giu ban bam, khong phai token tho")
                .isNotEqualTo(rawToken)
                .hasSize(64)
                .isEqualTo(sha256Hex(rawToken));
    }

    /** Token phai du dai de khong the do: 32 byte ngau nhien -> 43 ky tu Base64url. */
    @Test
    void forgotPassword_tokenDuDaiVaKhacNhauMoiLan() {
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail(user.getEmail());

        passwordService.forgotPassword(req);
        passwordService.forgotPassword(req);

        ArgumentCaptor<String> raws = ArgumentCaptor.forClass(String.class);
        verify(passwordResetNotifier, times(2)).sendResetLink(eq(user), raws.capture(), eq(30L));

        assertThat(raws.getAllValues().get(0)).hasSize(43);
        assertThat(raws.getAllValues().get(0))
                .as("moi yeu cau phai sinh token moi")
                .isNotEqualTo(raws.getAllValues().get(1));
    }

    @Test
    void forgotPassword_emailKhongTonTai_khongGuiGiCa() {
        when(userRepository.findByEmailIgnoreCase("khongton@service-operations.local")).thenReturn(Optional.empty());

        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail("khongton@service-operations.local");

        passwordService.forgotPassword(req);

        verify(passwordResetNotifier, never()).sendResetLink(any(), any(), anyLong());
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
        expiredToken.setTokenHash(sha256Hex("expired-token"));
        expiredToken.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(passwordResetTokenRepository.findByTokenHash(sha256Hex("expired-token"))).thenReturn(Optional.of(expiredToken));

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
        token.setTokenHash(sha256Hex("valid-token"));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(30));

        when(passwordResetTokenRepository.findByTokenHash(sha256Hex("valid-token"))).thenReturn(Optional.of(token));
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

        when(passwordResetTokenRepository.findByTokenHash(sha256Hex("used-token"))).thenReturn(Optional.of(usedToken));

        assertThat(passwordService.isResetTokenValid("used-token")).isFalse();
    }
}
