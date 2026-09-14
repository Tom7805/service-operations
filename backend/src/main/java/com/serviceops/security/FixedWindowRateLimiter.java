package com.serviceops.security;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;


public final class FixedWindowRateLimiter {

    /** Tran so cua so giu dong thoi. 50k ban ghi nho, du cho mot may chu don. */
    private static final int MAX_TRACKED_KEYS = 50_000;

    private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<>();

    public void check(String key, int maxAttempts, long windowSeconds) {
        if (windows.size() >= MAX_TRACKED_KEYS) {
            evict(windowSeconds);
        }
        Instant now = Instant.now();
        windows.compute(key, (ignored, current) -> {
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
    }

    private void evict(long windowSeconds) {
        Instant now = Instant.now();
        Iterator<Map.Entry<String, Window>> it = windows.entrySet().iterator();
        while (it.hasNext()) {
            Window w = it.next().getValue();
            if (Duration.between(w.startedAt, now).getSeconds() >= windowSeconds) {
                it.remove();
            }
        }
        if (windows.size() >= MAX_TRACKED_KEYS) {
            windows.clear();
        }
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
