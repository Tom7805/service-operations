-- NCL-01-CN-009: persistent audit trail for two-factor configuration changes
CREATE TABLE two_factor_config_audits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    updated_by_user_id BIGINT NULL,
    updated_by_username VARCHAR(100) NULL,
    previous_enabled BOOLEAN NOT NULL,
    new_enabled BOOLEAN NOT NULL,
    changed_at DATETIME NOT NULL,
    INDEX idx_two_factor_config_audit_role_time (role_id, changed_at),
    INDEX idx_two_factor_config_audit_time (changed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;