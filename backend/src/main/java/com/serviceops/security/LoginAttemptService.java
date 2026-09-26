package com.serviceops.security;
import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.identity.auth.entity.LoginAttempt;
import com.serviceops.modules.identity.auth.repository.LoginAttemptRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Dem so lan dang nhap sai, tam khoa tai khoan va ghi nhat ky dang nhap (NCL-01-CN-001).
 *
 * <p>TC-02: sai mat khau {@link #MAX_FAILED_ATTEMPTS} lan lien tiep thi lan thu tiep theo bi tu choi
 * kem thoi gian cho. TC-04: moi lan dang nhap thanh cong hay that bai deu duoc luu vao bang
 * {@code login_attempts} VA vao Nhat ky he thong ({@code audit_logs}, loai AUTH) de quan tri vien
 * tra cuu duoc tren giao dien.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    /** Mac dinh 5 phut; dat nho (vi du 10 giay) qua bien LOGIN_LOCK_SECONDS khi can thu nhanh. */
    public static final long DEFAULT_LOCK_SECONDS = 300;

    private static final String AUDIT_LABEL = "Đăng nhập hệ thống";

    private final UserRepository userRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final AuditLogService auditLogService;

    @Value("${app.security.login.lock-seconds:" + DEFAULT_LOCK_SECONDS + "}")
    private long lockSeconds = DEFAULT_LOCK_SECONDS;

    public boolean isLocked(User user) {
        return user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now());
    }

    public long remainingLockSeconds(User user) {
        if (user.getLockedUntil() == null) {
            return 0;
        }
        long seconds = ChronoUnit.SECONDS.between(LocalDateTime.now(), user.getLockedUntil());
        return Math.max(1, seconds);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(User user, String ipAddress) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        saveAttempt(user, user.getUsername(), true, ipAddress);
        audit(user.getId(), user.getUsername(), "Đăng nhập thành công", ipAddress, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRejectedWhileLocked(User user, String ipAddress) {
        saveAttempt(user, user.getUsername(), false, ipAddress);
        audit(user.getId(), user.getUsername(), "Đăng nhập bị từ chối", ipAddress,
                "Tài khoản đang tạm khóa do nhập sai mật khẩu nhiều lần.");
    }

    /** Mat khau dung nhung tai khoan da bi quan tri vien khoa/ngung hoat dong. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRejectedInactive(User user, String ipAddress) {
        saveAttempt(user, user.getUsername(), false, ipAddress);
        audit(user.getId(), user.getUsername(), "Đăng nhập bị từ chối", ipAddress,
                "Tài khoản đã bị quản trị viên khóa.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(User user, String usernameAttempted, String ipAddress) {
        String note = "Sai tên tài khoản hoặc mật khẩu.";
        if (user != null) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            note = "Sai mật khẩu lần " + attempts + "/" + MAX_FAILED_ATTEMPTS + ".";
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(LocalDateTime.now().plusSeconds(lockSeconds));
                note += " Tài khoản bị tạm khóa " + lockSeconds + " giây.";
                log.warn("LOGIN_LOCKED userId={} username={} lockSeconds={}", user.getId(), user.getUsername(), lockSeconds);
            }
            userRepository.save(user);
        }
        saveAttempt(user, usernameAttempted, false, ipAddress);
        audit(user != null ? user.getId() : null, usernameAttempted, "Đăng nhập thất bại", ipAddress, note);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void lockForTwoFactor(User user, long lockSeconds) {
        user.setLockedUntil(LocalDateTime.now().plusSeconds(lockSeconds));
        userRepository.save(user);
    }

    private void saveAttempt(User user, String usernameAttempted, boolean success, String ipAddress) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setUser(user);
        attempt.setUsernameAttempted(usernameAttempted);
        attempt.setSuccess(success);
        attempt.setIpAddress(ipAddress);
        loginAttemptRepository.save(attempt);
    }

    /** Nuot moi loi ghi nhat ky — khong de su co nhat ky lam hong luong dang nhap. */
    private void audit(Long userId, String username, String action, String ipAddress, String note) {
        try {
            String detail = (note != null ? note + " " : "") + "Địa chỉ IP: " + (ipAddress != null ? ipAddress : "không rõ") + ".";
            auditLogService.recordAs(userId, truncate(username), action, AuditTargetType.AUTH, userId,
                    AUDIT_LABEL, detail);
        } catch (RuntimeException ex) {
            log.warn("Khong ghi duoc nhat ky dang nhap cho {}", username, ex);
        }
    }

    private static String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 100 ? value.substring(0, 100) : value;
    }
}
