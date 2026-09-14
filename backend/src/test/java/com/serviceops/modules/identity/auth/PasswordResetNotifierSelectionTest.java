package com.serviceops.modules.identity.auth;

import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.impl.DomainReachabilityChecker;
import com.serviceops.modules.identity.auth.service.impl.LoggingPasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.impl.MailPasswordResetNotifier;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kiem tra viec CHON BAN CAI DAT luc chay — phan ma unit test khong cham toi
 * duoc, vi no do Spring quyet dinh qua {@code @ConditionalOnExpression}.
 *
 * <p>Day la diem mau chot cua co che: khai bao {@code SMTP_HOST} la chuyen sang
 * gui thu that, o BAT KY profile nao. Neu mot ngay nao do dieu kien bi viet sai
 * (vi du coi chuoi rong la "da cau hinh"), he thong se im lang chon nham ban cai
 * dat — va khong test nao khac phat hien duoc.</p>
 */
class PasswordResetNotifierSelectionTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(org.springframework.boot.autoconfigure.AutoConfigurations
                    .of(MailSenderAutoConfiguration.class))
            .withUserConfiguration(LoggingPasswordResetNotifier.class, MailPasswordResetNotifier.class,
                    DomainReachabilityChecker.class);

    @Test
    void chuaKhaiBaoSmtp_dungBanGhiLog() {
        runner.withPropertyValues("spring.mail.host=")
                .run(context -> assertThat(context.getBean(PasswordResetNotifier.class))
                        .isInstanceOf(LoggingPasswordResetNotifier.class));
    }

    /**
     * Truong hop de sai nhat: docker-compose truyen {@code SMTP_HOST=} rong, tuc
     * thuoc tinh CO TON TAI nhung khong co gia tri. {@code @ConditionalOnProperty}
     * se coi day la "da cau hinh" va chon nham ban gui thu that — roi hong luc gui.
     * Vi vay dung {@code @ConditionalOnExpression} kiem tra chuoi rong.
     */
    @Test
    void khaiBaoSmtpRong_vanDungBanGhiLog() {
        runner.withPropertyValues("spring.mail.host=", "app.mail.from=", "app.frontend.base-url=")
                .run(context -> assertThat(context.getBean(PasswordResetNotifier.class))
                        .isInstanceOf(LoggingPasswordResetNotifier.class));
    }

    @Test
    void khaiBaoSmtp_chuyenSangGuiThuThat_keCaOMoiTruongPhatTrien() {
        runner.withPropertyValues(
                        "spring.mail.host=localhost",
                        "spring.mail.port=1025",
                        "app.mail.from=no-reply@congty.vn",
                        "app.frontend.base-url=http://localhost:5173")
                .run(context -> assertThat(context.getBean(PasswordResetNotifier.class))
                        .isInstanceOf(MailPasswordResetNotifier.class));
    }

    /** Khong bao gio duoc co ca hai ban cung luc — se thanh loi "2 beans found". */
    @Test
    void khongBaoGioCoHaiBanCungLuc() {
        runner.withPropertyValues(
                        "spring.mail.host=smtp.congty.vn",
                        "app.mail.from=no-reply@congty.vn",
                        "app.frontend.base-url=https://vanhanh.congty.vn")
                .run(context -> assertThat(context.getBeansOfType(PasswordResetNotifier.class)).hasSize(1));
    }
}
