package com.serviceops.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Chan mot cau hinh nguy hiem: chay {@code prod} ma khong khai bao may chu SMTP.
 *
 * <p>Khi do khong co ban cai dat {@code PasswordResetNotifier} nao duoc tao
 * ({@code MailPasswordResetNotifier} doi co SMTP, {@code LoggingPasswordResetNotifier}
 * bi chan boi {@code @Profile("!prod")}), nen ung dung se khong len duoc. Nhung
 * thong bao mac dinh cua Spring khi do la "No qualifying bean of type
 * PasswordResetNotifier" — dung ve ky thuat nhung khong noi cho nguoi trien khai
 * biet phai lam gi.</p>
 *
 * <p>Lop nay chay TRUOC va nem ra mot thong bao noi ro thieu bien nao. Su ton tai
 * cua no la de bien mot loi kho hieu thanh mot loi tu giai thich — day la khac
 * biet giua "ung dung khong len duoc, khong ai biet vi sao" va "ung dung khong
 * len duoc, va dong dau tien cua log noi thang phai dat bien nao".</p>
 */
@Configuration
@Profile("prod")
public class PasswordResetMailRequiredConfig {

    public PasswordResetMailRequiredConfig(@Value("${spring.mail.host:}") String mailHost) {
        if (mailHost == null || mailHost.isBlank()) {
            throw new IllegalStateException("""
                    Dang chay profile 'prod' ma chua khai bao may chu SMTP (bien SMTP_HOST).

                    Khong co no thi chuc nang khoi phuc mat khau se khong gui duoc thu, trong khi
                    giao dien van bao "da gui" — nguoi dung bi khoa ngoai ma khong ai biet cho toi
                    khi co nguoi bao. Ung dung dung khoi dong CO Y de loi lo ra ngay bay gio.

                    Can dat: SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, MAIL_FROM, FRONTEND_BASE_URL.

                    Neu chi muon chay thu ma chua co may chu thu that, dung profile 'dev' (lien ket
                    khoi phuc se duoc ghi ra logger AUDIT_MOCK_EMAIL), hoac chay mot may chu thu
                    cuc bo nhu MailHog roi tro SMTP_HOST vao no.
                    """);
        }
    }
}
