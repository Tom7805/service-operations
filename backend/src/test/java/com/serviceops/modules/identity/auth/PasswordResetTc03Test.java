package com.serviceops.modules.identity.auth;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-01-CN-008 TC-03 — ba tinh chat phai giu duoc, kiem tra bang HANH VI THAT
 * chu khong bang trang thai noi bo.
 *
 * <ol>
 *   <li>Luon tra ve thanh cong du email co ton tai hay khong (chong do email).</li>
 *   <li>Voi email co that, token hop le dat lai duoc mat khau.</li>
 *   <li>Token bi danh dau da dung va KHONG tai su dung duoc.</li>
 * </ol>
 *
 * <p>Diem thu ba la cho de tu lua nhat: kiem tra {@code usedAt != null} moi chi
 * chung minh cai DAU da duoc dat, chua chung minh cai dau do duoc TON TRONG o
 * lan goi sau. Vi vay o day thuc su goi lai lan hai.</p>
 */
@ExtendWith(MockitoExtension.class)
class PasswordResetTc03Test {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PasswordResetNotifier notifier;

    private PasswordServiceImpl passwordService;
    private User user;

    @BeforeEach
    void setUp() {
        passwordService = new PasswordServiceImpl(userRepository, tokenRepository,
                passwordEncoder, new PasswordPolicyValidator(), notifier);
        ReflectionTestUtils.setField(passwordService, "resetTokenTtlMinutes", 30L);

        user = new User();
        user.setId(7L);
        user.setUsername("nguoidung07");
        user.setEmail("nguoidung07@congty.vn");
        user.setFullName("Nguoi Dung Bay");
        user.setPasswordHash("hash-cu");
        user.setTokenVersion(0);
    }

    // ---------------------------------------------------------------- 1 -----

    @Test
    @DisplayName("TC-03.1: email KHONG ton tai — khong nem loi, khong lo ra la khong ton tai")
    void emailKhongTonTai_khongNemLoi() {
        when(userRepository.findByEmailIgnoreCase("khongcoai@congty.vn")).thenReturn(Optional.empty());

        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail("khongcoai@congty.vn");

        assertThatCode(() -> passwordService.forgotPassword(req)).doesNotThrowAnyException();
        verify(tokenRepository, never()).save(any());
        verify(notifier, never()).sendResetLink(any(), anyString(), anyLong());
    }

    @Test
    @DisplayName("TC-03.1: email CO ton tai — cung khong nem loi, tra ve giong het truong hop tren")
    void emailCoTonTai_cungKhongNemLoi() {
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail(user.getEmail());

        assertThatCode(() -> passwordService.forgotPassword(req)).doesNotThrowAnyException();
    }

    /**
     * Truong hop de lam vo tinh chat chong do email nhat, va la loi that da tung
     * ton tai trong ban dau cua dot sua nay.
     *
     * <p>Neu loi gui thu thoat ra ngoai thi:
     * email khong ton tai -> khong gui gi -> thanh cong;
     * email co that, gui hong -> nem loi -> that bai.
     * Ke tan cong chi can so sanh hai ket qua la do ra tai khoan nao co that,
     * du tang tren khong he tiet lo gi.</p>
     */
    @Test
    @DisplayName("TC-03.1: gui thu THAT BAI van khong duoc nem loi — neu khong se lo ra tai khoan co that")
    void guiThuThatBai_vanKhongNemLoi() {
        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("may chu thu tu choi"))
                .when(notifier).sendResetLink(any(), anyString(), anyLong());

        ForgotPasswordReq req = new ForgotPasswordReq();
        req.setEmail(user.getEmail());

        assertThatCode(() -> passwordService.forgotPassword(req))
                .as("loi gui thu phai duoc nuot lai o tang duoi, khong duoc lo ra ngoai API")
                .doesNotThrowAnyException();
    }

    // ---------------------------------------------------------------- 2+3 ---

    /**
     * Dung mot "CSDL gia" nho de mo phong dung vong doi that: token duoc luu khi
     * quen mat khau, roi duoc tra cuu lai khi dat lai mat khau. Nho vay lan goi
     * thu hai nhin thay dung ban ghi ma lan dau da danh dau — thu ma mock tra ve
     * gia tri co dinh khong mo phong duoc.
     */
    @Test
    @DisplayName("TC-03.2+3: token hop le dat lai duoc mat khau, va lan hai bi tu choi")
    void tokenHopLe_datLaiDuocMotLan_lanHaiBiTuChoi() {
        Map<String, PasswordResetToken> csdlGia = new HashMap<>();

        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(tokenRepository.save(any(PasswordResetToken.class))).thenAnswer(inv -> {
            PasswordResetToken t = inv.getArgument(0);
            csdlGia.put(t.getTokenHash(), t);
            return t;
        });
        when(tokenRepository.findByTokenHash(anyString()))
                .thenAnswer(inv -> Optional.ofNullable(csdlGia.get(inv.<String>getArgument(0))));
        when(passwordEncoder.encode("MatKhauMoi9")).thenReturn("hash-moi");

        // --- Buoc 1: yeu cau khoi phuc, lay token THO tu kenh gui ---
        ForgotPasswordReq forgot = new ForgotPasswordReq();
        forgot.setEmail(user.getEmail());
        passwordService.forgotPassword(forgot);

        ArgumentCaptor<String> rawCaptor = ArgumentCaptor.forClass(String.class);
        verify(notifier).sendResetLink(eq(user), rawCaptor.capture(), eq(30L));
        String tokenTho = rawCaptor.getValue();

        // --- Buoc 2: token con hieu luc ---
        assertThat(passwordService.isResetTokenValid(tokenTho))
                .as("token vua tao phai dung duoc").isTrue();

        // --- Buoc 3: dat lai mat khau THANH CONG (TC-03.2) ---
        ResetPasswordReq reset = new ResetPasswordReq();
        reset.setToken(tokenTho);
        reset.setNewPassword("MatKhauMoi9");
        passwordService.resetPassword(reset);

        assertThat(user.getPasswordHash()).isEqualTo("hash-moi");
        assertThat(user.getTokenVersion()).as("moi phien cu phai bi cham dut").isEqualTo(1);

        // --- Buoc 4: token da bi danh dau va KHONG con hieu luc (TC-03.3) ---
        assertThat(csdlGia.get(csdlGia.keySet().iterator().next()).getUsedAt()).isNotNull();
        assertThat(passwordService.isResetTokenValid(tokenTho))
                .as("token da dung thi phai het hieu luc ngay").isFalse();

        // --- Buoc 5: DUNG LAI lan hai phai bi tu choi (chong replay) ---
        ResetPasswordReq dungLai = new ResetPasswordReq();
        dungLai.setToken(tokenTho);
        dungLai.setNewPassword("MatKhauKhac8");

        assertThatThrownBy(() -> passwordService.resetPassword(dungLai))
                .as("day moi la tinh chat that: cai dau 'da dung' phai duoc TON TRONG o lan sau")
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RESET_TOKEN_INVALID);

        // Mat khau khong duoc doi them lan nua.
        assertThat(user.getPasswordHash()).isEqualTo("hash-moi");
        assertThat(user.getTokenVersion()).isEqualTo(1);
    }

    @Test
    @DisplayName("TC-03.3: token bi sua tay khong tra ve thong tin gi khac token khong ton tai")
    void tokenBiSuaTay_cungBiTuChoi() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        ResetPasswordReq req = new ResetPasswordReq();
        req.setToken("token-bia-dat");
        req.setNewPassword("MatKhauMoi9");

        assertThatThrownBy(() -> passwordService.resetPassword(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.RESET_TOKEN_INVALID);
    }
}
