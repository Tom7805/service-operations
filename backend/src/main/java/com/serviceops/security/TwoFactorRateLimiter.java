package com.serviceops.security;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class TwoFactorRateLimiter {

    private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<>();

    @Value("${app.two-factor.rate-limit.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.two-factor.rate-limit.window-seconds:60}")
    private long windowSeconds;

    public void check(String ipAddress, String challengeToken) {
        checkKey("ip:" + normalize(ipAddress));
        checkKey("challenge:" + normalize(challengeToken));
    }

    private void checkKey(String key) {
        Instant now = Instant.now();
        Window window = windows.compute(key, (ignored, current) -> {
            if (current == null || Duration.between(current.startedAt, now).getSeconds() >= windowSeconds) {
                return new Window(now, 1);
            }
            if (current.attempts >= maxAttempts) {
                throw new BusinessRuleException(ErrorCode.TOO_MANY_REQUESTS,
                        "Qua nhieu lan thu. Vui long thu lai sau.");
            }
            current.attempts++;
            return current;
        });

        if (window == null) {
            throw new IllegalStateException("Khong the tao cua so gioi han 2FA");
        }
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim();
    }

    private static final class Window {
        private final Instant startedAt;
        private int attempts;

        private Window(Instant startedAt, int attempts) {
            this.startedAt = startedAt;
            this.attempts = attempts;
        }
    }
}