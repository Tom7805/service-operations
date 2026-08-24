-- Epic NCL-01: Dang nhap va phan quyen theo cay to chuc
-- NCL-01-CN-006: Nhat ky truy cap du lieu nhay cam (Sensitive Data Access Log)
-- Quy tac lien quan: QTN-03 (Ghi nhat ky truy cap du lieu nhay cam)
-- Moi lan xem hoac xuat du lieu luong, gia von va bien loi nhuan deu duoc ghi nhat ky.

CREATE TABLE sensitive_access_logs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    username    VARCHAR(100) NOT NULL,
    action      VARCHAR(20)  NOT NULL,
    data_type   VARCHAR(30)  NOT NULL,
    target_id   BIGINT       NULL,
    target_ref  VARCHAR(255) NULL,
    ip_address  VARCHAR(45)  NULL,
    detail      VARCHAR(1000) NULL,
    accessed_at DATETIME     NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Khong dung FK sang users de bao toan lich su (TC-04): khi user bi xoa,
    -- nhat ky truy cap van duoc giu lai (username/target denormalized).
    INDEX idx_sensitive_log_user_time (user_id, accessed_at),
    INDEX idx_sensitive_log_type_time (data_type, accessed_at),
    INDEX idx_sensitive_log_time      (accessed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
