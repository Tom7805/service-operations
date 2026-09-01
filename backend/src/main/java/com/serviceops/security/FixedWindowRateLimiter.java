package com.serviceops.security;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Bo dem "cua so co dinh" dung chung cho cac bo gioi han tan suat.
 *
 * <p>Truoc day thuat toan nay nam thang trong {@code TwoFactorRateLimiter}. Khi
 * can gioi han them cho {@code /auth/forgot-password}, tach ra day de hai noi
 * dung chung mot cai da duoc kiem chung, thay vi chep lai lan thu hai.</p>
 *
 * <p>Han muc duoc truyen vao TUNG LAN GOI chu khong nam trong lop nay: moi bo
 * gioi han giu cau hinh cua rieng no (2FA chat hon, khoi phuc mat khau long hon),
 * va nho vay cac test hien co van dat gia tri qua chinh lop goi.</p>
 *
 * <p><b>Chong phinh bo nho.</b> Ban cu de map lon vo han. Voi mot diem cuoi
 * CONG KHAI khong can dang nhap, ke tan cong chi viec gui hang trieu dia chi IP
 * hoac email khac nhau la map phinh cho toi khi het bo nho — tuc chinh bo gioi
 * han lai tro thanh duong tan cong. O day map bi chan tran, va khi cham tran thi
 * don cac cua so da het han truoc; neu don xong van day thi xoa sach de he thong
 * chon "tam thoi noi long" thay vi "chet vi het bo nho".</p>
 */
public final class FixedWindowRateLimiter {

    /** Tran so cua so giu dong thoi. 50k ban ghi nho, du cho mot may chu don. */
    private static final int MAX_TRACKED_KEYS = 50_000;

    private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<>();

    /**
     * Ghi nhan mot lan thu cho {@code key}. Nem {@link BusinessRuleException}
     * mang {@link ErrorCode#TOO_MANY_REQUESTS} khi vuot han muc trong cua so.
     */
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
