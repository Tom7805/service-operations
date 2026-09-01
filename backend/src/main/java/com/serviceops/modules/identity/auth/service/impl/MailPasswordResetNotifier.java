package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
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
@Profile("prod")
@RequiredArgsConstructor
public class MailPasswordResetNotifier implements PasswordResetNotifier {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Value("${app.frontend.base-url:}")
    private String frontendBaseUrl;

    @PostConstruct
    void validateConfig() {
        requireConfigured("spring.mail.host (SMTP_HOST)", mailHost);
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
            // Khong kem token vao thong bao loi: log loi cung la log.
            log.error("PASSWORD_RESET_MAIL_FAILED userId={} nguyenNhan={}", user.getId(), ex.getMessage());
            throw ex;
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
