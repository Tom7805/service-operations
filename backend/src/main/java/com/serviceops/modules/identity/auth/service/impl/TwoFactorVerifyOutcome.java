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
 */
record TwoFactorVerifyOutcome(boolean thanhCong, ErrorCode errorCode, String message, LoginRes loginRes) {

    static TwoFactorVerifyOutcome thanhCong(LoginRes loginRes) {
        return new TwoFactorVerifyOutcome(true, null, null, loginRes);
    }

    static TwoFactorVerifyOutcome loi(ErrorCode errorCode, String message) {
        return new TwoFactorVerifyOutcome(false, errorCode, message, null);
    }
}
