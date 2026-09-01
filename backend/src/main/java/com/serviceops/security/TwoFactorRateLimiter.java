package com.serviceops.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Gioi han so lan nhap ma 2FA, theo dia chi IP va theo tung phien thu thach.
 *
 * <p>Thuat toan cua so co dinh da duoc tach ra {@link FixedWindowRateLimiter} de
 * dung chung voi {@link PasswordResetRateLimiter}. Cau hinh van nam o day nen
 * hai bo gioi han co han muc doc lap nhau.</p>
 */
@Service
public class TwoFactorRateLimiter {

    private final FixedWindowRateLimiter limiter = new FixedWindowRateLimiter();

    @Value("${app.two-factor.rate-limit.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.two-factor.rate-limit.window-seconds:60}")
    private long windowSeconds;

    public void check(String ipAddress, String challengeToken) {
        limiter.check("2fa:ip:" + normalize(ipAddress), maxAttempts, windowSeconds);
        limiter.check("2fa:challenge:" + normalize(challengeToken), maxAttempts, windowSeconds);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim();
    }
}
