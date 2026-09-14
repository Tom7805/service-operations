-- NCL-06-CN-002/003/004: Bang cham cong theo tuan (nop / duyet / tu choi).
CREATE TABLE timesheets (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    week_start_date  DATE NOT NULL,
    week_end_date    DATE NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    total_hours      DECIMAL(6, 2) NOT NULL DEFAULT 0,
    submitted_by     BIGINT NULL,
    submitted_at     DATETIME NULL,
    approved_by      BIGINT NULL,
    approved_at      DATETIME NULL,
    rejected_by      BIGINT NULL,
    rejected_at      DATETIME NULL,
    reject_reason    VARCHAR(1000) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_timesheets_user_week (user_id, week_start_date),
    INDEX idx_timesheets_status (status),
    CONSTRAINT fk_timesheets_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_timesheets_submitted_by FOREIGN KEY (submitted_by) REFERENCES users (id),
    CONSTRAINT fk_timesheets_approved_by FOREIGN KEY (approved_by) REFERENCES users (id),
    CONSTRAINT fk_timesheets_rejected_by FOREIGN KEY (rejected_by) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
