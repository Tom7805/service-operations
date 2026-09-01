package com.serviceops.modules.identity.auth;

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
     * Spring Boot tu tao JavaMailSender ngay ca khi khong khai bao may chu SMTP,
     * nen neu khong chan thi loi chi lo ra LUC GUI — tuc luc mot nguoi dung that
     * dang cho thu. He thong trong nhu chay binh thuong nhung khong ai lay lai
     * duoc mat khau, va khong ai biet cho toi khi co nguoi bao.
     */
    @Test
    void banThat_thieuCauHinhSmtp_dungKhoiDong() {
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(notifier, "mailHost", "");
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");
        ReflectionTestUtils.setField(notifier, "frontendBaseUrl", "https://vanhanh.congty.vn");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.mail.host");
    }

    @Test
    void banThat_thieuDiaChiNguoiGui_dungKhoiDong() {
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(notifier, "mailHost", "smtp.congty.vn");
        ReflectionTestUtils.setField(notifier, "fromAddress", "");
        ReflectionTestUtils.setField(notifier, "frontendBaseUrl", "https://vanhanh.congty.vn");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.from");
    }

    /**
     * Thieu goc dia chi giao dien thi lien ket gui di se sai, nguoi dung bam vao
     * khong toi dau. Cung phai chan ngay luc khoi dong.
     */
    @Test
    void banThat_thieuGocDiaChiGiaoDien_dungKhoiDong() {
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(notifier, "mailHost", "smtp.congty.vn");
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");
        ReflectionTestUtils.setField(notifier, "frontendBaseUrl", "");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.frontend.base-url");
    }

    @Test
    void banThat_dayDuCauHinh_khoiDongBinhThuong() {
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class));
        ReflectionTestUtils.setField(notifier, "mailHost", "smtp.congty.vn");
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");
        ReflectionTestUtils.setField(notifier, "frontendBaseUrl", "https://vanhanh.congty.vn");

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .doesNotThrowAnyException();
    }
}
