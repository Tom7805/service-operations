package com.serviceops.modules.identity.auth.service.impl;

import java.util.Hashtable;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Tra ban ghi MX (Mail eXchanger) cua mot ten mien qua DNS, de biet TRUOC KHI
 * GUI xem dia chi email co the nhan duoc thu hay khong.
 *
 * <p><b>Vi sao can lop nay.</b> Truoc day he thong phan biet "mail seed" voi
 * "mail that" bang cach NGUOI VAN HANH tu tay doi bien moi truong {@code SMTP_HOST}
 * giua hai lan chay — mot backend duy nhat khong the tu dong xu ly ca hai loai
 * dia chi trong cung mot lan chay. Do la mot lo hong thiet ke: bat buoc con
 * nguoi nho doi cau hinh qua lai, va quen doi (nhu da xay ra trong phien nay)
 * la nguyen nhan tai sao ma gui cho tai khoan that lai roi vao log gia lap thay
 * vi hop thu that.</p>
 *
 * <p>Cach dung dung: mot backend, LUON cau hinh SMTP that, va tu dong quyet dinh
 * theo TUNG DIA CHI xem co gui that hay khong. Ten mien nhu {@code service-operations.local}
 * khong co ban ghi MX nao tren DNS cong khai (RFC 6762 danh rieng {@code .local}
 * cho mang noi bo) nen tra ve {@code false} — router sang log gia lap. Ten mien
 * that nhu {@code gmail.com} co MX nen tra ve {@code true} — gui qua SMTP that.</p>
 *
 * <p><b>Vi sao tra MX chu khong chi thu ket noi SMTP roi bat loi.</b> Mot so may
 * chu SMTP (ke ca Gmail lam relay) CHAP NHAN thu ngay o buoc giao dich (tra ve
 * 250 OK) roi moi bounce lai KHONG DONG BO sau do, khi da thu resolve duoc dia
 * chi dich va phat hien khong ton tai. Neu dua vao {@code mailSender.send()}
 * khong nem loi de ket luan "gui thanh cong" thi ket luan do co the sai — code
 * se ghi log "PASSWORD_RESET_MAIL_SENT" trong khi thu se bi tra lai vai phut sau.
 * Tra MX truoc la kiem tra DONG BO va DANG TIN CAY hon nhieu.</p>
 */
@Slf4j
@Component
public class DomainReachabilityChecker {

    /** Timeout ngan: day la mot buoc kiem tra truoc khi gui, khong duoc lam nguoi dung cho lau. */
    private static final String DNS_TIMEOUT_MS = "1500";
    private static final String DNS_RETRIES = "1";

    /**
     * @return {@code true} neu ten mien sau dau {@code @} cua {@code email} co it
     *     nhat mot ban ghi MX hop le trong DNS cong khai. Tra ve {@code false}
     *     cho moi truong hop khac: email khong hop le, khong tra duoc DNS (mang
     *     loi, timeout), hoac ten mien khong ton tai.
     */
    public boolean hasMailExchanger(String email) {
        String domain = extractDomain(email);
        if (domain == null) {
            return false;
        }
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", DNS_TIMEOUT_MS);
            env.put("com.sun.jndi.dns.timeout.retries", DNS_RETRIES);
            DirContext dnsContext = new InitialDirContext(env);
            Attributes attrs = dnsContext.getAttributes(domain, new String[] {"MX"});
            Attribute mx = attrs.get("MX");
            return mx != null && mx.size() > 0;
        } catch (NamingException ex) {
            // Bao gom ca truong hop domain khong ton tai (NameNotFoundException,
            // lop con cua NamingException) lan loi DNS tam thoi. Ca hai deu duoc
            // xu ly nhu nhau o day: "khong chac gui duoc" -> tra ve false, va
            // tang tren se fallback sang log gia lap thay vi lang phi mot lan
            // goi SMTP chac chan that bai.
            log.debug("DOMAIN_KHONG_CO_MX domain={} nguyenNhan={}", domain, ex.getMessage());
            return false;
        }
    }

    private String extractDomain(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        if (at < 0 || at == email.length() - 1) {
            return null;
        }
        return email.substring(at + 1);
    }
}
