package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Ban gia lap cho moi truong PHAT TRIEN: in lien ket khoi phuc ra log de lap
 * trinh vien tu lay, vi cac tai khoan mau dung ten mien {@code .local} (RFC 6762)
 * — khong bao gio dinh tuyen ra Internet nen khong co hom thu nao ton tai.
 *
 * <p><b>Khong bao gio duoc kich hoat o moi truong that.</b> Rang buoc nam o hai
 * lop doc lap:</p>
 * <ol>
 *   <li>{@code @Profile("!prod")} — Spring khong tao bean nay khi chay prod.</li>
 *   <li>Kiem tra lai ngay trong {@link #guard()}: neu vi mot ly do nao do bean
 *       van duoc tao trong khi profile {@code prod} dang bat, ung dung <b>dung
 *       khoi dong</b>. Mot lop bao ve co the bi vo hieu do cau hinh sai; hai lop
 *       doc lap thi kho hon nhieu.</li>
 * </ol>
 *
 * <p>Log ra mot logger RIENG ({@code AUDIT_MOCK_EMAIL}) chu khong dung logger cua
 * lop, de ai van hanh cung co the tat hoac chan rieng kenh nay ma khong anh huong
 * phan log con lai.</p>
 */
@Component
@Profile("!prod")
// Chi chay khi CHUA khai bao may chu SMTP. Vua khai bao SMTP_HOST la ban that
// tiep quan ngay, ke ca tren may phat trien — vi gui thu that luon an toan hon
// in token ra log.
@ConditionalOnExpression("'${spring.mail.host:}'.isEmpty()")
public class LoggingPasswordResetNotifier implements PasswordResetNotifier {

    private static final Logger MOCK_MAIL_LOG = LoggerFactory.getLogger("AUDIT_MOCK_EMAIL");

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${spring.profiles.active:dev}")
    private String activeProfiles;

    @PostConstruct
    void guard() {
        if (activeProfiles != null && activeProfiles.toLowerCase().contains("prod")) {
            throw new IllegalStateException(
                    "LoggingPasswordResetNotifier (ban gia lap, in token ra log) da bi kich hoat trong khi "
                            + "profile 'prod' dang bat. Day la lo hong chiem tai khoan: ai doc duoc log la doi "
                            + "duoc mat khau bat ky ai. Ung dung dung khoi dong co y de khong ban giao nham ban gia lap.");
        }
    }

    @Override
    public void sendResetLink(User user, String rawToken, long ttlMinutes) {
        MOCK_MAIL_LOG.info(
                "[GIA LAP - CHI MOI TRUONG PHAT TRIEN] MA KHOI PHUC cho {} (het han sau {} phut): {}",
                user.getEmail(), ttlMinutes, rawToken);
    }

}
