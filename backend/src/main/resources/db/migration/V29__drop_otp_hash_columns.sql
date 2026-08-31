-- NCL-01-CN-009: chuyển sang TOTP (RFC 6238) kiểu Google Authenticator/Authy —
-- không còn sinh/lưu mã một lần (OTP) rồi gửi qua kênh mô phỏng nữa, mã 6 số
-- được cả server và app Authenticator tự tính theo giờ hệ thống + khóa bí mật
-- (users.totp_secret, xem V28) nên hai cột dưới đây không còn dùng tới.
ALTER TABLE user_sessions
    DROP COLUMN otp_hash,
    DROP COLUMN otp_expires_at;
