-- NCL-01-CN-009: Xac thuc hai buoc cho tai khoan xem du lieu tai chinh
-- Bo sung cot can thiet cho 2FA vao hai bang da co san tu V1:
--   - two_factor_settings.updated_by : nguoi thuc hien bat/tat 2FA (TC-04 - luu lich su)
--   - user_sessions                  : luu ma mot lan (OTP), han dung va bo dem lan thu sai (TC-01/TC-02)

ALTER TABLE two_factor_settings
    ADD COLUMN updated_by BIGINT NULL,
    ADD CONSTRAINT fk_two_factor_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users (id);

ALTER TABLE user_sessions
    ADD COLUMN otp_hash VARCHAR(64) NULL,
    ADD COLUMN otp_expires_at DATETIME NULL,
    ADD COLUMN otp_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN verified_at DATETIME NULL;
