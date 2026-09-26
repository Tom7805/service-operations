package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;

/**
 * Ket qua cua mot lan xac thuc OTP — dung THAY CHO viec nem loi truc tiep ben
 * trong giao dich.
 *
 * <p>Xem {@link TwoFactorVerificationTransaction} de biet vi sao can tach ra
 * mot kieu du lieu ket qua thay vi throw ngay: nem RuntimeException ben trong
 * mot giao dich se cuon nguoc CA giao dich do, ke ca cac thay doi hop le da
 * luu truoc do trong cung giao dich.</p>
 *
 * <p>{@code lockedUserId}/{@code lockedUsername} chi co gia tri khi CHINH lan
 * xac thuc nay vua lam tai khoan bi tam khoa do nhap sai OTP qua so lan — de
 * lop goi canh bao quan tri vien SAU khi giao dich da commit (NCL-01-CN-009-TC-02).</p>
 */
record TwoFactorVerifyOutcome(boolean thanhCong, ErrorCode errorCode, String message, LoginRes loginRes,
                              Long lockedUserId, String lockedUsername) {

    static TwoFactorVerifyOutcome thanhCong(LoginRes loginRes) {
        return new TwoFactorVerifyOutcome(true, null, null, loginRes, null, null);
    }

    static TwoFactorVerifyOutcome loi(ErrorCode errorCode, String message) {
        return new TwoFactorVerifyOutcome(false, errorCode, message, null, null, null);
    }

    static TwoFactorVerifyOutcome vuaTamKhoa(String message, Long userId, String username) {
        return new TwoFactorVerifyOutcome(false, ErrorCode.ACCOUNT_LOCKED, message, null, userId, username);
    }

    boolean vuaTamKhoaTaiKhoan() {
        return lockedUserId != null;
    }
}
