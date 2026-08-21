package com.serviceops.modules.identity.auth.exception;

/**
 * Ném ra khi đường dẫn khôi phục mật khẩu đã hết hạn hoặc đã được dùng.
 * NCL-01-CN-008-TC-02: hệ thống báo đường dẫn hết hạn và mời gửi yêu cầu mới.
 */
public class ResetTokenExpiredException extends RuntimeException {

    public ResetTokenExpiredException(String message) {
        super(message);
    }
}
