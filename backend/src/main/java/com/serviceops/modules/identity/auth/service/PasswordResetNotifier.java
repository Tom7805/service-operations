package com.serviceops.modules.identity.auth.service;

import com.serviceops.modules.identity.user.entity.User;

/**
 * Kenh chuyen lien ket khoi phuc mat khau toi nguoi dung.
 *
 * <p><b>Vi sao phai la mot interface.</b> Truoc day {@code PasswordServiceImpl}
 * tu ghi thang token ra {@code log.info(...)}. Cach do co mot lo hong that:
 * <b>ai doc duoc log la chiem duoc bat ky tai khoan nao</b> — chi can goi
 * {@code /auth/forgot-password} voi email cua nan nhan roi doc dong log vua sinh
 * ra, khong can cham vao hom thu cua ho. Ma quyen doc log thuong thap hon han
 * quyen doi mat khau nguoi khac, va log con chay di khap noi: {@code docker
 * logs}, tep tren dia, ban sao luu, he gom log, thuong la ca dich vu ben thu ba.
 * (CWE-532 — dua thong tin nhay cam vao tep nhat ky.)</p>
 *
 * <p>Bản thân việc <i>giả lập</i> gửi thư trong môi trường phát triển là hợp lệ.
 * Sai nam o cho <b>in bi mat ra kenh log chung</b>. Tach interface cho phep moi
 * truong phat trien van tien (xem {@code LoggingPasswordResetNotifier}) trong khi
 * moi truong that khong bao gio co duong nao de lam dieu do.</p>
 */
public interface PasswordResetNotifier {

    /**
     * Chuyen lien ket dat lai mat khau toi nguoi dung.
     *
     * @param user       chu tai khoan
     * @param rawToken   token THO — chi duoc dat vao lien ket gui cho dung nguoi
     *                   dung do. Khong duoc ghi log, khong duoc luu lai o dau.
     *                   Trong CSDL chi luu ban bam SHA-256 cua no.
     * @param ttlMinutes so phut lien ket con hieu luc, de ghi vao noi dung thu
     */
    void sendResetLink(User user, String rawToken, long ttlMinutes);
}
