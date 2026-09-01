package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Ban that: gui thu khoi phuc mat khau qua SMTP. Chi ton tai o profile
 * {@code prod}.
 *
 * <p><b>Dung khoi dong khi chua cau hinh thu.</b> Day la diem quan trong nhat cua
 * lop nay. Spring Boot tu dong tao {@code JavaMailSender} ngay ca khi khong khai
 * bao may chu SMTP — va khi do loi chi lo ra LUC GUI, tuc luc mot nguoi dung that
 * dang cho thu. Ket qua: he thong trong nhu chay binh thuong, nhung khong ai lay
 * lai duoc mat khau, va khong ai biet cho toi khi co nguoi bao.
 * Vi vay {@link #validateConfig()} kiem tra ngay luc khoi dong va nem loi neu
 * thieu cau hinh: tha khong len duoc con hon len roi hong am tham.</p>
 *
 * <p><b>Khong bao gio ghi token ra log.</b> Ke ca khi gui that bai — thong bao
 * loi chi noi la gui that bai cho tai khoan nao, khong kem token.</p>
 */
@Slf4j
@Component
// Bat khi CO khai bao may chu SMTP — o BAT KY profile nao, khong rieng prod.
// Nho vay co the thu gui thu that ngay tren may phat trien (vi du bang MailHog)
// ma khong phai dung nguyen cau hinh production.
// Dung @ConditionalOnExpression thay vi @ConditionalOnProperty vi cai sau coi
// chuoi RONG la "co khai bao" — ma docker-compose lai truyen SMTP_HOST= rong.
@ConditionalOnExpression("!'${spring.mail.host:}'.isEmpty()")
@RequiredArgsConstructor
public class MailPasswordResetNotifier implements PasswordResetNotifier {

    /** Cung logger voi ban gia lap, de van hanh chan/tat rieng mot kenh. */
    private static final org.slf4j.Logger MOCK_MAIL_LOG =
            org.slf4j.LoggerFactory.getLogger("AUDIT_MOCK_EMAIL");

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Value("${app.frontend.base-url:}")
    private String frontendBaseUrl;

    /**
     * Khi gui thu that bai, co ghi lien ket ra log khong?
     *
     * <p>{@code true} o moi truong phat trien: cac tai khoan mau dung ten mien
     * {@code .local} nen thu chac chan khong toi, va neu khong co duong nay thi
     * nguoi lam bi ket hoan toan.</p>
     *
     * <p>O {@code prod} gia tri nay bi GHIM CUNG {@code false} trong
     * {@code application-prod.yml} — khong doc tu bien moi truong — nen khong ai
     * co the vo tinh (hay co tinh) bat lai bang cach dat bien khi trien khai.</p>
     */
    @Value("${app.mail.fallback-to-log:true}")
    private boolean fallbackToLog;

    /**
     * {@code spring.mail.host} da duoc dieu kien tren lop bao dam, nen o day chi
     * con kiem tra hai gia tri ma thieu chung thi thu van gui di nhung VO DUNG:
     * khong co dia chi nguoi gui, hoac lien ket trong thu tro di dau khong biet.
     */
    @PostConstruct
    void validateConfig() {
        requireConfigured("app.mail.from (MAIL_FROM)", fromAddress);
        requireConfigured("app.frontend.base-url (FRONTEND_BASE_URL)", frontendBaseUrl);
    }

    private void requireConfigured(String key, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Thieu cau hinh bat buoc '" + key + "'. Chuc nang khoi phuc mat khau se im lang khong "
                            + "gui duoc thu, trong khi giao dien van bao 'da gui' — nguoi dung se bi khoa ngoai "
                            + "ma khong ai biet. Ung dung dung khoi dong co y de loi lo ra ngay bay gio.");
        }
    }

    @Override
    public void sendResetLink(User user, String rawToken, long ttlMinutes) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(user.getEmail());
        message.setSubject("Khoi phuc mat khau - Van Hanh Dich Vu");
        message.setText(buildBody(user, rawToken, ttlMinutes));

        try {
            mailSender.send(message);
            // Ghi nhan de kiem toan — co userId, KHONG co token.
            log.info("PASSWORD_RESET_MAIL_SENT userId={}", user.getId());
        } catch (MailException ex) {
            // KHONG nem loi ra ngoai. Ban dau cho nay co `throw ex;` va do la mot
            // LOI THAT, voi hai hau qua:
            //
            // 1. Pha co che chong do tai khoan — hau qua nang hon. Ca tang tren co
            //    y tra 200 du email co ton tai hay khong. Nhung neu loi gui thu
            //    thoat ra ngoai thi:
            //        email khong ton tai  -> khong gui gi   -> 200
            //        email co that, gui hong -> nem loi     -> 500
            //    Ke tan cong chi can nhin ma trang thai la biet tai khoan nao co
            //    that. Dung cai ma tac gia ban dau da co cong tranh.
            //
            // 2. Voi tai khoan mau dung ten mien `.local` (khong dinh tuyen ra
            //    Internet), moi lan bam "Quen mat khau" deu ra loi 500.
            //
            // He thong that cung hanh xu the nay: chung cu gui, thu khong toi thi
            // bounce bat dong bo, con API van tra ve binh thuong.
            log.error("PASSWORD_RESET_MAIL_FAILED userId={} nguyenNhan={}", user.getId(), ex.getMessage());

            // O moi truong phat trien, ghi lien ket ra log de nguoi lam khong bi
            // ket khi tai khoan mau co dia chi khong gui toi duoc. O prod gia tri
            // nay bi ghim cung `false` trong application-prod.yml (khong qua bien
            // moi truong), nen token khong bao gio lot vao log that.
            if (fallbackToLog) {
                MOCK_MAIL_LOG.info(
                        "[GUI THU THAT BAI - GHI RA LOG VI DANG O MOI TRUONG PHAT TRIEN] "
                                + "Lien ket khoi phuc cho {} (het han sau {} phut): {}",
                        user.getEmail(), ttlMinutes, buildResetLink(rawToken));
            }
        }
    }

    private String buildBody(User user, String rawToken, long ttlMinutes) {
        return """
                Chao %s,

                Chung toi nhan duoc yeu cau dat lai mat khau cho tai khoan %s.
                Bam vao lien ket duoi day de dat mat khau moi:

                %s

                Lien ket co hieu luc trong %d phut va chi dung duoc mot lan.

                Neu ban khong yeu cau dieu nay, hay bo qua thu nay. Mat khau hien tai
                cua ban khong thay doi.
                """
                .formatted(user.getFullName(), user.getUsername(), buildResetLink(rawToken), ttlMinutes);
    }

    private String buildResetLink(String rawToken) {
        String base = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
        return base + "/?token=" + rawToken;
    }
}
