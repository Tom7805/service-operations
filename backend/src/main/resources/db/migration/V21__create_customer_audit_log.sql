-- NCL-02-CN-002 (TC-05): Nhat ky khach hang
-- Ghi lai nguoi thuc hien, noi dung va thoi diem khi co thay doi lien quan
-- den chong trung ho so khach hang.
CREATE TABLE customer_audit_logs (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id    BIGINT NULL,
    action_type    VARCHAR(30) NOT NULL,
    detail         VARCHAR(1000) NULL,
    actor_id       BIGINT NOT NULL,
    actor_username VARCHAR(100) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_audit_customer (customer_id),
    INDEX idx_customer_audit_actor (actor_id),
    INDEX idx_customer_audit_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;