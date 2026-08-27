package com.serviceops.modules.identity.auth.enums;

/**
 * Kênh gửi mã một lần (OTP) cho xác thực hai bước (NCL-01-CN-009).
 *
 * <p>Hệ thống chỉ chạy trên dữ liệu mô phỏng (QTN-04), nên việc "gửi mã"
 * được hiện thực bằng cách ghi log thay vì gọi dịch vụ email/SMS thật.</p>
 */
public enum TwoFactorChannel {
    /** Gửi OTP qua thư điện tử (mô phỏng — ghi log). */
    EMAIL,
    /** Gửi OTP qua tin nhắn SMS (dự phòng cho tương lai). */
    SMS
}
