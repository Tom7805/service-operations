package com.serviceops.modules.identity.auth;

import com.serviceops.config.PasswordResetMailRequiredConfig;
import com.serviceops.modules.identity.auth.service.impl.LoggingPasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.impl.MailPasswordResetNotifier;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * Khoa lai LOI HUA quan trong nhat cua dot sua nay: khong the ban giao nham ban
 * gia lap, va khong the chay that ma quen cau hinh thu.
 *
 * <p>Hai truong hop duoi day deu la "ung dung PHAI dung khoi dong". Chung khong
 * kiem tra chuc nang nghiep vu nao ca — chung kiem tra rang he thong tu tu choi
 * chay khi dang o mot cau hinh nguy hiem. Neu mot ngay nao do co nguoi go hai
 * hang rao nay cho "tien trien khai", test nay do ngay.</p>
 */
class PasswordResetNotifierGuardTest {

    /**
     * Ban gia lap in token ra log. Neu no bang cach nao do duoc kich hoat trong
     * khi profile prod dang bat, do la lo hong chiem tai khoan: ai doc duoc log
     * la doi duoc mat khau bat ky ai. Ung dung phai chet ngay luc khoi dong.
     */
    @Test
    void banGiaLap_chayVoiProfileProd_dungKhoiDong() {
        LoggingPasswordResetNotifier notifier = new LoggingPasswordResetNotifier();
        ReflectionTestUtils.setField(notifier, "activeProfiles", "prod");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(notifier, "guard"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod");
    }

    @Test
    void banGiaLap_chayVoiProfileDev_khoiDongBinhThuong() {
        LoggingPasswordResetNotifier notifier = new LoggingPasswordResetNotifier();
        ReflectionTestUtils.setField(notifier, "activeProfiles", "dev");

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(notifier, "guard"))
                .doesNotThrowAnyException();
    }

    /**
     * Chay prod ma quen khai bao SMTP_HOST: khong ban cai dat nao duoc tao, nen
     * ung dung khong len duoc. Lop guard nay bien thong bao kho hieu ("No
     * qualifying bean of type PasswordResetNotifier") thanh mot thong bao noi ro
     * thieu bien nao va phai lam gi.
     */
    @Test
    void prod_thieuMayChuSmtp_dungKhoiDongVaNoiRoThieuGi() {
        assertThatThrownBy(() -> new PasswordResetMailRequiredConfig(""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SMTP_HOST")
                .hasMessageContaining("MAIL_FROM");
    }

    @Test
    void prod_coMayChuSmtp_khoiDongBinhThuong() {
        assertThatCode(() -> new PasswordResetMailRequiredConfig("smtp.congty.vn"))
                .doesNotThrowAnyException();
    }

    /**
     * `spring.mail.host` da duoc dieu kien tren lop bao dam, nen ban that chi con
     * kiem tra hai gia tri ma thieu chung thi thu VAN GUI DI nhung vo dung: khong
     * co dia chi nguoi gui, hoac lien ket trong thu tro di dau khong biet.
     */
    @Test
    void banThat_thieuDiaChiNguoiGui_dungKhoiDong() {
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(notifier, "fromAddress", "");
        ReflectionTestUtils.setField(notifier, "frontendBaseUrl", "https://vanhanh.congty.vn");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.from");
    }

    @Test
    void banThat_thieuGocDiaChiGiaoDien_dungKhoiDong() {
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");
        ReflectionTestUtils.setField(notifier, "frontendBaseUrl", "");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.frontend.base-url");
    }

    @Test
    void banThat_dayDuCauHinh_khoiDongBinhThuong() {
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");
        ReflectionTestUtils.setField(notifier, "frontendBaseUrl", "https://vanhanh.congty.vn");

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .doesNotThrowAnyException();
    }
}
