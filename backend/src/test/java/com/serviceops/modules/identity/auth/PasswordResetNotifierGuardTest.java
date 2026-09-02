package com.serviceops.modules.identity.auth;

import com.serviceops.config.PasswordResetMailRequiredConfig;
import com.serviceops.modules.identity.auth.service.impl.LoggingPasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.impl.DomainReachabilityChecker;
import com.serviceops.modules.identity.auth.service.impl.MailPasswordResetNotifier;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
        DomainReachabilityChecker domainChecker = mock(DomainReachabilityChecker.class);
        when(domainChecker.hasMailExchanger(anyString())).thenReturn(true);
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class), domainChecker);
        ReflectionTestUtils.setField(notifier, "fromAddress", "");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.from");
    }

    // Test "thieu goc dia chi giao dien" da bi GO BO cung voi cau hinh do: thu
    // khoi phuc gio chua MA 6 SO chu khong con lien ket nao, nen app.frontend.base-url
    // khong con la dieu kien de gui thu duoc.

    /**
     * Gui thu that bai KHONG duoc nem loi ra ngoai.
     *
     * <p>Day tung la mot loi that trong ban dau: cho do co {@code throw ex;}, va
     * no pha co che chong do tai khoan ma tang tren da co cong xay. Tang tren co
     * y tra 200 du email co ton tai hay khong; nhung neu loi gui thu thoat ra thi
     * "email khong ton tai" tra 200 con "email co that nhung gui hong" tra 500 —
     * ke tan cong chi can nhin ma trang thai la do ra duoc tai khoan nao co that.</p>
     */
    @Test
    void guiThuThatBai_khongNemLoiRaNgoai() {
        JavaMailSender sender = mock(JavaMailSender.class);
        // sendResetLink gio dung MimeMessage (khai bao UTF-8 tuong minh de giu
        // dau tieng Viet) thay vi SimpleMailMessage — phai stub createMimeMessage()
        // tra ve mot doi tuong that, khong thi no tra ve null va sinh ra
        // NullPointerException thay vi MailSendException nhu bai test dinh gia lap.
        MimeMessage mime = new MimeMessage((Session) null);
        when(sender.createMimeMessage()).thenReturn(mime);
        doThrow(new MailSendException("may chu thu tu choi")).when(sender).send(any(MimeMessage.class));

        DomainReachabilityChecker domainChecker = mock(DomainReachabilityChecker.class);
        when(domainChecker.hasMailExchanger(anyString())).thenReturn(true);
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(sender, domainChecker);
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");
        ReflectionTestUtils.setField(notifier, "fallbackToLog", false);

        User user = new User();
        user.setId(1L);
        user.setEmail("nguoidung@congty.vn");
        user.setUsername("nguoidung");
        user.setFullName("Nguoi Dung");

        assertThatCode(() -> notifier.sendResetLink(user, "token-tho", 30L))
                .as("loi gui thu phai bi nuot lai, neu khong se lo ra tai khoan nao co that")
                .doesNotThrowAnyException();
    }

    @Test
    void banThat_dayDuCauHinh_khoiDongBinhThuong() {
        DomainReachabilityChecker domainChecker = mock(DomainReachabilityChecker.class);
        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(mock(JavaMailSender.class), domainChecker);
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(notifier, "validateConfig"))
                .doesNotThrowAnyException();
    }

    /**
     * Test QUAN TRONG NHAT cua thiet ke moi: mot backend tu dong bao quat CA HAI
     * loai dia chi, khong con phai doi bien moi truong bang tay giua hai lan chay.
     *
     * <p>Day chinh la loi hua da bi vi pham trong phien lam viec truoc — sau khi
     * test xong voi Gmail that, nguoi van hanh (toi) da doi backend ve che do gia
     * lap ma QUEN doi lai, khien ma gui cho tai khoan that bi roi vao log thay vi
     * hop thu that. Domain co MX -> gui that; domain khong co MX -> ghi log, KHONG
     * goi mailSender.send() (tranh mot lan goi SMTP chac chan that bai).</p>
     */
    @Test
    void domainKhongCoMx_khongGoiSmtp_ghiLogThayVao() {
        JavaMailSender sender = mock(JavaMailSender.class);
        DomainReachabilityChecker domainChecker = mock(DomainReachabilityChecker.class);
        when(domainChecker.hasMailExchanger("nv01@service-operations.local")).thenReturn(false);

        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(sender, domainChecker);
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");
        ReflectionTestUtils.setField(notifier, "fallbackToLog", true);

        User user = new User();
        user.setId(1L);
        user.setEmail("nv01@service-operations.local");
        user.setUsername("nv01");
        user.setFullName("Nguoi Dung");

        notifier.sendResetLink(user, "483920", 10L);

        verify(sender, never()).createMimeMessage();
        verify(sender, never()).send(any(MimeMessage.class));
    }

    @Test
    void domainCoMx_guiThatQuaSmtp() {
        JavaMailSender sender = mock(JavaMailSender.class);
        MimeMessage mime = new MimeMessage((Session) null);
        when(sender.createMimeMessage()).thenReturn(mime);
        DomainReachabilityChecker domainChecker = mock(DomainReachabilityChecker.class);
        when(domainChecker.hasMailExchanger("ai.do@gmail.com")).thenReturn(true);

        MailPasswordResetNotifier notifier = new MailPasswordResetNotifier(sender, domainChecker);
        ReflectionTestUtils.setField(notifier, "fromAddress", "no-reply@congty.vn");

        User user = new User();
        user.setId(2L);
        user.setEmail("ai.do@gmail.com");
        user.setUsername("aido");
        user.setFullName("Ai Do");

        notifier.sendResetLink(user, "483920", 10L);

        verify(sender).send(mime);
    }
}
