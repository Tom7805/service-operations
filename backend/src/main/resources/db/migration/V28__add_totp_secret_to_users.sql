-- NCL-01-CN-009: chuyển xác thực hai bước từ OTP gửi qua kênh mô phỏng (log)
-- sang TOTP (RFC 6238) kiểu Google Authenticator/Authy — mã sinh ngay trên máy
-- người dùng, không cần gửi/nhận qua email hay SMS.
--
-- totp_secret       : khóa bí mật base32 dùng để sinh/kiểm mã 6 số theo thời gian.
--                     NULL nghĩa là tài khoản chưa từng thiết lập (lần đăng nhập
--                     kế tiếp thuộc vai trò bật 2FA sẽ ép thiết lập bằng mã QR).
-- totp_confirmed_at : thời điểm người dùng xác nhận thành công mã đầu tiên sau
--                     khi quét QR — đánh dấu đã thiết lập xong, không hiện lại QR nữa.
ALTER TABLE users
    ADD COLUMN totp_secret VARCHAR(64) NULL AFTER token_version,
    ADD COLUMN totp_confirmed_at DATETIME NULL AFTER totp_secret;
