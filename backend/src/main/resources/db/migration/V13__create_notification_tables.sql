-- NCL-06-CN-002: Tao bang thong bao (notifications) cho module thong bao.
-- Luu tru thong bao in-app/email/sms/push den nguoi dung.
CREATE TABLE notifications (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id     BIGINT NOT NULL,
    type             VARCHAR(50) NOT NULL,
    title            VARCHAR(255) NOT NULL,
    content          TEXT NULL,
    channel          VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    reference_id     BIGINT NULL,
    reference_type   VARCHAR(50) NULL,
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    read_at          DATETIME NULL,
    sent_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id),
    INDEX idx_notifications_recipient (recipient_id),
    INDEX idx_notifications_recipient_read (recipient_id, is_read),
    INDEX idx_notifications_reference (reference_id, reference_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;