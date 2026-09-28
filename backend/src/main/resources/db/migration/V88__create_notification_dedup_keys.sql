-- NCL-14-CN-002 (QTN-27): khoa "chiem truoc" dung chung cho cac tac vu co the chay lai
-- (retry/crash giua chung) trong cung chu ky va can dam bao chi xu ly dung mot lan. Hien tai chi
-- dung boi NotificationDigestServiceImpl de chong gop trung ban tong hop cuoi ngay.
CREATE TABLE IF NOT EXISTS notification_dedup_keys (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    dedup_key   VARCHAR(255) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_dedup_keys_key UNIQUE (dedup_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
