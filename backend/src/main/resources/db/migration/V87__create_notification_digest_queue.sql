-- NCL-14-CN-002 TC-02: hang doi tam cho cac thong bao thuoc nhom nguoi dung chon nhan theo tan
-- suat DAILY_DIGEST, cho toi khi NotificationDigestJob gop thanh mot ban tong hop cuoi ngay
-- (moi item bi xoa khoi bang nay ngay khi da duoc gop).
CREATE TABLE IF NOT EXISTS notification_digest_queue (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id        BIGINT NOT NULL,
    notification_group  VARCHAR(50) NOT NULL,
    type                VARCHAR(50) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    content             TEXT NULL,
    reference_id        BIGINT NULL,
    reference_type      VARCHAR(255) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_digest_queue_recipient FOREIGN KEY (recipient_id) REFERENCES users (id),
    INDEX idx_notification_digest_queue_recipient_group (recipient_id, notification_group)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
