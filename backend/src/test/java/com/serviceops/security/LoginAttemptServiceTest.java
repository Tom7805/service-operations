package com.serviceops.security;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.identity.auth.repository.LoginAttemptRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoginAttemptRepository loginAttemptRepository;

    @Mock
    private AuditLogService auditLogService;

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService(userRepository, loginAttemptRepository, auditLogService);
    }

    @Test
    void recordFailure_lanSaiThuNam_tamKhoaTaiKhoanVaGhiNhatKy() {
        // NCL-01-CN-001-TC-02: sai lan thu 5 thi tai khoan bi tam khoa, lan thu 6 se bi tu choi.
        User user = new User();
        user.setId(7L);
        user.setUsername("nv01");
        user.setFailedLoginAttempts(LoginAttemptService.MAX_FAILED_ATTEMPTS - 1);

        loginAttemptService.recordFailure(user, "nv01", "10.0.0.1");

        assertThat(loginAttemptService.isLocked(user)).isTrue();
        assertThat(loginAttemptService.remainingLockSeconds(user)).isPositive();
        // TC-04: lan that bai duoc ghi vao Nhat ky he thong (loai AUTH) kem nguoi thuc hien.
        verify(auditLogService).recordAs(eq(7L), eq("nv01"), eq("Đăng nhập thất bại"),
                eq(AuditTargetType.AUTH), eq(7L), anyString(), contains("tạm khóa"));
    }

    @Test
    void recordSuccess_datLaiBoDemVaGhiNhatKy() {
        User user = new User();
        user.setId(7L);
        user.setUsername("nv01");
        user.setFailedLoginAttempts(3);

        loginAttemptService.recordSuccess(user, "10.0.0.1");

        assertThat(user.getFailedLoginAttempts()).isZero();
        verify(auditLogService).recordAs(eq(7L), eq("nv01"), eq("Đăng nhập thành công"),
                eq(AuditTargetType.AUTH), eq(7L), anyString(), anyString());
    }

    @Test
    void recordFailure_taiKhoanKhongTonTai_vanGhiNhatKyTheoTenDaGo() {
        loginAttemptService.recordFailure(null, "khong.ton.tai", "10.0.0.1");

        verify(auditLogService).recordAs(isNull(), eq("khong.ton.tai"), eq("Đăng nhập thất bại"),
                eq(AuditTargetType.AUTH), isNull(), anyString(), anyString());
    }

    @Test
    void lockForTwoFactor_setsLockTimeAndSavesUser() {
        // Doi vi tu phut sang giay (khop LoginAttemptService.lockForTwoFactor
        // moi) — cho phep dat gia tri nho khi test ma khong can doi kieu du lieu.
        User user = new User();
        LocalDateTime before = LocalDateTime.now().plusSeconds(900);

        loginAttemptService.lockForTwoFactor(user, 900);

        assertThat(user.getLockedUntil()).isAfterOrEqualTo(before);
        verify(userRepository).save(user);
    }

    @Test
    void lockForTwoFactor_usesNewTransaction() throws NoSuchMethodException {
        Method method = LoginAttemptService.class.getMethod("lockForTwoFactor", User.class, long.class);

        assertThat(method.getAnnotation(Transactional.class).propagation())
                .isEqualTo(Propagation.REQUIRES_NEW);
    }
}