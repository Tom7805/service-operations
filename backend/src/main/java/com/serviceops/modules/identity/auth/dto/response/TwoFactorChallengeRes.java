package com.serviceops.modules.identity.auth.dto.response;

/**
 * Kết quả bước 1 của đăng nhập khi tài khoản thuộc vai trò bật 2FA (NCL-01-CN-009).
 *
 * @param challengeToken mã định danh phiên chờ, dùng khi nộp mã ở bước 2.
 * @param enrollment     true nếu đây là lần đầu tài khoản này bật 2FA — chưa có app
 *                       Authenticator nào liên kết, cần hiện mã QR để thiết lập.
 * @param otpauthUri     chuỗi {@code otpauth://...} để vẽ QR — chỉ có giá trị khi
 *                       {@code enrollment} = true, null trong các lần đăng nhập sau.
 * @param secretForDisplay khóa bí mật đã định dạng dễ đọc (fallback nhập tay khi
 *                       không quét được QR) — cũng chỉ có khi {@code enrollment} = true.
 */
public record TwoFactorChallengeRes(
        String challengeToken,
        boolean enrollment,
        String otpauthUri,
        String secretForDisplay
) {
}
