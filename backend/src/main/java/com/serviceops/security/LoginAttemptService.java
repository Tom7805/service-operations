package com.serviceops.security;

import com.serviceops.modules.identity.auth.entity.LoginAttempt;
import com.serviceops.modules.identity.auth.repository.LoginAttemptRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final int LOCK_SECONDS = 10;

    private final UserRepository userRepository;
    private final LoginAttemptRepository loginAttemptRepository;

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

    /**
     * REQUIRES_NEW: nhat ky dang nhap va bo dem khoa tam phai duoc luu lai
     * ke ca khi luong goi (AuthServiceImpl.login) sau do nem loi va rollback.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(User user, String ipAddress) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        saveAttempt(user, user.getUsername(), true, ipAddress);
    }

    /** Ghi nhat ky khi mot lan thu dang nhap bi tu choi vi tai khoan dang tam khoa (AC-04), khong tang them bo dem. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRejectedWhileLocked(User user, String ipAddress) {
        saveAttempt(user, user.getUsername(), false, ipAddress);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(User user, String usernameAttempted, String ipAddress) {
        if (user != null) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(LocalDateTime.now().plusSeconds(LOCK_SECONDS));
            }
            userRepository.save(user);
        }
        saveAttempt(user, usernameAttempted, false, ipAddress);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void lockForTwoFactor(User user, long lockMinutes) {
        user.setLockedUntil(LocalDateTime.now().plusMinutes(lockMinutes));
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
}
