-- Epic NCL-03: Co hoi ban hang
-- NCL-03-CN-001 (TC-04): Nhat ky co hoi
-- Ghi lai nguoi thuc hien, noi dung va thoi diem khi co thay doi lien quan
-- den co hoi ban hang (vd: tao co hoi moi, truy cap bi tu choi).
CREATE TABLE opportunity_audit_logs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id    BIGINT NULL,
    action_type       VARCHAR(30) NOT NULL,
    detail            VARCHAR(1000) NULL,
    actor_id          BIGINT NOT NULL,
    actor_username    VARCHAR(100) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_opportunity_audit_opportunity (opportunity_id),
    INDEX idx_opportunity_audit_actor (actor_id),
    INDEX idx_opportunity_audit_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;