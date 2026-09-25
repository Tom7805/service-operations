-- NCL-14-CN-002: Cau hinh nhan thong bao cua nguoi dung theo tung nhom nghiep vu — bat/tat va
-- chon tan suat nhan ngay (IMMEDIATE) hoac gop thanh ban tong hop cuoi ngay (DAILY_DIGEST).
-- Khong co dong cho mot (user_id, notification_group) nghia la mac dinh bat + IMMEDIATE.
CREATE TABLE IF NOT EXISTS notification_preferences (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    notification_group  VARCHAR(50) NOT NULL,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    frequency           VARCHAR(20) NOT NULL DEFAULT 'IMMEDIATE',
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_notification_preferences_user_group UNIQUE (user_id, notification_group)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
