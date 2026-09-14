package com.serviceops.security;

import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Gioi han tan suat cho {@code POST /auth/forgot-password}.
 *
 * <p>Vi sao can: diem cuoi nay CONG KHAI, khong doi dang nhap, va no vua sinh
 * ban ghi trong CSDL vua gui thu that. Khong chan thi co hai duong lam dung:</p>
 * <ol>
 *   <li><b>Doi bom hom thu.</b> Ke tan cong lap yeu cau voi email cua nan nhan,
 *       he thong ngoan ngoan gui hang nghin thu khoi phuc. Nan nhan khong the
 *       dung hom thu, va ten mien gui thu cua cong ty bi danh dau la spam.</li>
 *   <li><b>Phinh bang.</b> Moi yeu cau tao mot dong trong {@code
 *       password_reset_tokens}; khong chan thi bang lon khong gioi han.</li>
 * </ol>
 *
 * <p>Chan theo CA hai truc:</p>
 * <ul>
 *   <li><b>IP</b> — chan mot nguon gui rai rac cho nhieu email khac nhau.</li>
 *   <li><b>Email</b> — chan nhieu nguon cung nham vao mot nan nhan. Neu chi chan
 *       theo IP thi mot mang may chu phan tan van doi bom duoc mot hom thu.</li>
 * </ul>
 *
 * <p>Han muc long hon 2FA (5 lan/phut): quen mat khau la thao tac binh thuong
 * va nguoi dung that co the bam lai vai lan khi cho thu. Mac dinh 5 lan moi 15
 * phut cho moi truc.</p>
 */
@Service
public class PasswordResetRateLimiter {

    private final FixedWindowRateLimiter limiter = new FixedWindowRateLimiter();

    @Value("${app.password-reset.rate-limit.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.password-reset.rate-limit.window-seconds:900}")
    private long windowSeconds;

    public void check(String ipAddress, String email) {
        limiter.check("pwreset:ip:" + normalize(ipAddress), maxAttempts, windowSeconds);
        limiter.check("pwreset:email:" + normalize(email).toLowerCase(Locale.ROOT), maxAttempts, windowSeconds);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim();
    }
}
