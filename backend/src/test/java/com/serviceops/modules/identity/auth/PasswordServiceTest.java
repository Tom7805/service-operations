package com.serviceops.modules.identity.auth;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.impl.PasswordResetAttemptRecorder;
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
                passwordEncoder, new PasswordPolicyValidator(), passwordResetNotifier,
                new PasswordResetAttemptRecorder(passwordResetTokenRepository));
        ReflectionTestUtils.setField(passwordService, "resetTokenTtlMinutes", 10L);

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
        verify(passwordResetNotifier).sendResetLink(eq(user), sentRaw.capture(), eq(10L));

        String rawToken = sentRaw.getValue();  // ma 6 chu so
        String storedHash = saved.getValue().getTokenHash();

        assertThat(rawToken).isNotBlank();
        assertThat(storedHash)
                .as("CSDL phai giu ban bam, khong phai token tho")
                .isNotEqualTo(rawToken)
                .hasSize(64)
                .isEqualTo(sha256Hex(user.getId() + ":" + rawToken));
    }

    /** Ma phai dung 6 chu so, va moi yeu cau sinh mot ma moi. */
    @Test
    void forgotPassword_maSauChuSoVaKhacNhauMoiLan() {
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail(user.getEmail());

        passwordService.forgotPassword(req);
        passwordService.forgotPassword(req);

        ArgumentCaptor<String> raws = ArgumentCaptor.forClass(String.class);
        verify(passwordResetNotifier, times(2)).sendResetLink(eq(user), raws.capture(), eq(10L));

        assertThat(raws.getAllValues().get(0)).hasSize(6).containsOnlyDigits();
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

    /** Bam GAN VOI nguoi dung — khop cach service bam: sha256("<userId>:<ma>"). */
    private String hashMa(long userId, String ma) {
        return sha256Hex(userId + ":" + ma);
    }

    @Test
    void resetPassword_maHetHan_nemResetTokenInvalid() {
        PasswordResetToken heHan = new PasswordResetToken();
        heHan.setUser(user);
        heHan.setTokenHash(hashMa(1L, "123456"));
        heHan.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(1L))
                .thenReturn(Optional.of(heHan));

        ResetPasswordReq req = new ResetPasswordReq();
        req.setEmail(user.getEmail());
        req.setCode("123456");
        req.setNewPassword("MatKhauMoi2");

        assertThatThrownBy(() -> passwordService.resetPassword(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RESET_TOKEN_INVALID);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_maHopLe_datLaiMatKhauVaDanhDauDaDung() {
        PasswordResetToken ma = new PasswordResetToken();
        ma.setUser(user);
        ma.setTokenHash(hashMa(1L, "483920"));
        ma.setExpiresAt(LocalDateTime.now().plusMinutes(10));

        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(1L))
                .thenReturn(Optional.of(ma));
        when(passwordEncoder.encode("MatKhauMoi2")).thenReturn("hashed-new-password");

        ResetPasswordReq req = new ResetPasswordReq();
        req.setEmail(user.getEmail());
        req.setCode("483920");
        req.setNewPassword("MatKhauMoi2");

        passwordService.resetPassword(req);

        assertThat(user.getPasswordHash()).isEqualTo("hashed-new-password");
        assertThat(user.getTokenVersion()).isEqualTo(1);
        assertThat(ma.getUsedAt()).isNotNull();
        verify(passwordResetTokenRepository).save(ma);
    }

    /**
     * Rao chan quan trong nhat cua co che ma 6 so: MOI lan nhap sai deu phai duoc
     * DEM. Khong dem thi khong gian 1.000.000 la do het bang tay cung duoc.
     *
     * <p>Luu y: viec dem gio nam trong {@link PasswordResetAttemptRecorder} — mot
     * bean RIENG chay trong giao dich rieng. Phai tach nhu vay vi ngay sau khi dem
     * thi service NEM LOI, ma nem loi runtime lam Spring cuon nguoc giao dich, keo
     * theo xoa luon con so vua dem.</p>
     *
     * <p>Ban dau dem thang trong service va test nay VAN XANH — vi mock giu gia tri
     * trong bo nho, khong co giao dich nao de cuon nguoc. Chay that moi lo ra: nhap
     * sai 5 lan roi nhap dung thi ma VAN duoc chap nhan. Day la gioi han that cua
     * unit test voi mock, khong phai loi cua test.</p>
     */
    @Test
    void resetPassword_maSai_tangSoLanThuVaTuChoi() {
        PasswordResetToken ma = new PasswordResetToken();
        ma.setId(99L);
        ma.setUser(user);
        ma.setTokenHash(hashMa(1L, "483920"));
        ma.setExpiresAt(LocalDateTime.now().plusMinutes(10));

        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(1L))
                .thenReturn(Optional.of(ma));
        // Bo ghi tra cuu lai ban ghi theo id trong giao dich rieng cua no
        when(passwordResetTokenRepository.findById(99L)).thenReturn(Optional.of(ma));

        ResetPasswordReq req = new ResetPasswordReq();
        req.setEmail(user.getEmail());
        req.setCode("000000");
        req.setNewPassword("MatKhauMoi2");

        assertThatThrownBy(() -> passwordService.resetPassword(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RESET_TOKEN_INVALID);

        assertThat(ma.getAttempts()).as("phai dem lan nhap sai").isEqualTo(1);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_nhapSaiQuaSoLanChoPhep_maChet() {
        PasswordResetToken ma = new PasswordResetToken();
        ma.setUser(user);
        ma.setTokenHash(hashMa(1L, "483920"));
        ma.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        ma.setAttempts(PasswordResetToken.MAX_ATTEMPTS);

        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(1L))
                .thenReturn(Optional.of(ma));

        ResetPasswordReq req = new ResetPasswordReq();
        req.setEmail(user.getEmail());
        // DUNG ma, nhung da nhap sai qua so lan cho phep -> van phai tu choi
        req.setCode("483920");
        req.setNewPassword("MatKhauMoi2");

        assertThatThrownBy(() -> passwordService.resetPassword(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RESET_TOKEN_INVALID);
        verify(userRepository, never()).save(any());
    }

    @Test
    void isResetCodeValid_maDaDung_traVeFalse() {
        PasswordResetToken daDung = new PasswordResetToken();
        daDung.setUser(user);
        daDung.setTokenHash(hashMa(1L, "483920"));
        daDung.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        daDung.setUsedAt(LocalDateTime.now());

        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(1L))
                .thenReturn(Optional.of(daDung));

        assertThat(passwordService.isResetCodeValid(user.getEmail(), "483920")).isFalse();
    }

}
