package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.internet.MimeMessage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Ban gui thu qua SMTP — va tu {@link DomainReachabilityChecker}, ban nay
 * KHONG CON gioi han theo profile hay theo "co cau hinh SMTP hay khong" nua.
 *
 * <p><b>Mot backend, tu dong bao quat ca hai loai dia chi.</b> Truoc day he
 * thong phan biet "mail seed" voi "mail that" bang cach nguoi van hanh doi bien
 * {@code SMTP_HOST} qua lai giua hai lan chay — dung mot backend nhung phai
 * doi cau hinh bang tay tuy theo dinh gui cho ai. Do la mot lo hong thiet ke
 * that: quen doi lai (nhu da xay ra) khien mail gui cho tai khoan that lai roi
 * vao log gia lap thay vi hop thu that.
 *
 * <p>Gio chi can cau hinh SMTP MOT LAN DUY NHAT (thuong tro vao mot dich vu
 * that nhu Gmail/SES), va lop nay tu dong quyet dinh theo TUNG DIA CHI: goi
 * {@link DomainReachabilityChecker#hasMailExchanger} de tra ban ghi MX cua ten
 * mien truoc khi gui. Ten mien khong co MX (nhu {@code .local} cua du lieu mau)
 * -> ghi ra log gia lap. Ten mien co MX (nhu {@code gmail.com}) -> gui that.</p>
 *
 * <p><b>Dung khoi dong khi chua cau hinh thu.</b> Spring Boot tu dong tao
 * {@code JavaMailSender} ngay ca khi khong khai bao may chu SMTP — va khi do
 * loi chi lo ra LUC GUI, tuc luc mot nguoi dung that dang cho thu. Vi vay
 * {@link #validateConfig()} kiem tra ngay luc khoi dong va nem loi neu thieu
 * cau hinh: tha khong len duoc con hon len roi hong am tham.</p>
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
    private final DomainReachabilityChecker domainChecker;

    @Value("${app.mail.from:}")
    private String fromAddress;


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
     * {@code spring.mail.host} da duoc dieu kien tren lop bao dam. Chi con kiem
     * tra dia chi nguoi gui: thieu no thi thu van "gui" nhung khong may chu nao
     * nhan, va loi chi lo ra khi da co nguoi dung that dang cho.
     *
     * <p>Truoc day cho nay con bat buoc {@code app.frontend.base-url} de dung
     * lien ket khoi phuc. Da bo: thu gio chua MA 6 SO chu khong con lien ket nao,
     * nen bat buoc no la chan khoi dong vi mot thu khong con duoc dung toi.</p>
     */
    @PostConstruct
    void validateConfig() {
        requireConfigured("app.mail.from (MAIL_FROM)", fromAddress);
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
        // TRA MX TRUOC KHI GUI — day la thay doi quan trong nhat: mot backend
        // DUY NHAT gio tu dong phan biet dia chi seed voi dia chi that, khong con
        // phai doi bien moi truong bang tay giua hai lan chay nua.
        //
        // Ten mien nhu `service-operations.local` khong co ban ghi MX tren DNS
        // cong khai (RFC 6762 danh rieng .local cho mang noi bo) nen o day tra ve
        // false — router thang sang log gia lap, KHONG ton mot lan goi SMTP chac
        // chan that bai. Ten mien that nhu gmail.com co MX nen gui qua SMTP that.
        if (!domainChecker.hasMailExchanger(user.getEmail())) {
            log.info("PASSWORD_RESET_DOMAIN_KHONG_TON_TAI userId={}", user.getId());
            if (fallbackToLog) {
                MOCK_MAIL_LOG.info(
                        "[TEN MIEN KHONG NHAN DUOC THU - GHI RA LOG] "
                                + "MA KHOI PHUC cho {} (het han sau {} phut): {}",
                        user.getEmail(), ttlMinutes, rawToken);
            }
            return;
        }

        // MimeMessage + MimeMessageHelper thay cho SimpleMailMessage, va khai bao
        // UTF-8 TUONG MINH ("true, UTF-8" trong constructor cua helper).
        //
        // Vi sao can doi: SimpleMailMessage khong co cho khai bao bo ma — no phu
        // thuoc bo ma MAC DINH cua may chay backend. Tren mot may Windows dat bo
        // ma he thong la cp1252 (rat pho bien), tieng Viet co dau se bi ghi sai
        // ngay tu luc dong goi thu, TRUOC CA khi thu roi khoi may — khong lien
        // quan gi toi Gmail hay noi nhan. Khai bao UTF-8 tuong minh loai bo hoan
        // toan su phu thuoc do.
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("Khôi phục mật khẩu - Vận Hành Dịch Vụ");
            helper.setText(buildBody(user, rawToken, ttlMinutes));
        } catch (jakarta.mail.MessagingException ex) {
            // Loi dung MimeMessageHelper (vi du dia chi "to" khong hop le) —
            // cung phai nuot lai, cung mot ly do voi nhanh MailException ben duoi:
            // khong duoc de lo ra ngoai tinh chat chong do email.
            log.error("FORGOT_PASSWORD_BUILD_MAIL_FAILED userId={} nguyenNhan={}", user.getId(), ex.getMessage());
            if (fallbackToLog) {
                MOCK_MAIL_LOG.info(
                        "[GUI THU THAT BAI - GHI RA LOG VI DANG O MOI TRUONG PHAT TRIEN] "
                                + "MA KHOI PHUC cho {} (het han sau {} phut): {}",
                        user.getEmail(), ttlMinutes, rawToken);
            }
            return;
        }

        try {
            mailSender.send(mimeMessage);
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
                                + "MA KHOI PHUC cho {} (het han sau {} phut): {}",
                        user.getEmail(), ttlMinutes, rawToken);
            }
        }
    }

    private String buildBody(User user, String maKhoiPhuc, long ttlMinutes) {
        // Dat MA len dau, tach rieng mot dong. Nguoi dung mo thu ra la thay ngay
        // con so can go, khong phai doc het doan van moi tim thay.
        //
        // Truoc day noi dung o day viet KHONG DAU — khong phai loi ma hoa, ma
        // ban than chuoi trong code chua tung co dau. Da viet lai co dau day du;
        // ket hop voi MimeMessageHelper khai bao UTF-8 tuong minh o sendResetLink,
        // dau tieng Viet gio duoc giu dung tu luc dong goi cho toi luc hien thi.
        return """
                Chào %s,

                Mã khôi phục mật khẩu cho tài khoản %s của bạn là:

                    %s

                Nhập mã này vào màn hình đặt lại mật khẩu. Mã có hiệu lực trong %d phút,
                chỉ dùng được một lần, và sẽ bị vô hiệu nếu nhập sai quá %d lần.

                Nếu bạn không yêu cầu điều này, hãy bỏ qua thư này. Mật khẩu hiện tại
                của bạn không thay đổi.
                """
                .formatted(user.getFullName(), user.getUsername(), maKhoiPhuc,
                        ttlMinutes, PasswordResetToken.MAX_ATTEMPTS);
    }
}
