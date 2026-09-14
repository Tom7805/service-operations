-- Nhat ky thao tac nghiep vu tong hop (audit_logs) — luu that tren server, thay cho cac o "nhat ky"
-- gia lap chi ton tai tren trinh duyet o tung man hinh truoc day.
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT NULL,
    actor_username VARCHAR(100) NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NULL,
    target_label VARCHAR(255) NULL,
    detail VARCHAR(1000) NULL,
    performed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX idx_audit_logs_performed_at ON audit_logs(performed_at);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
