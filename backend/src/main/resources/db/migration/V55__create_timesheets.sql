-- NCL-06-CN-002: nop bang cham cong theo tuan.
-- Moi ban ghi la mot bang cham cong tuan cua mot nhan su: khi nop, toan bo
-- dong gio cong DRAFT trong tuan chuyen sang SUBMITTED va bang o trang thai
-- PENDING_APPROVAL cho PM duyet (cac story duyet/tu choi sau cua Epic NCL-06).
CREATE TABLE timesheets (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    week_start_date  DATE NOT NULL,
    week_end_date    DATE NOT NULL,
    status           VARCHAR(30) NOT NULL,
    total_hours      DECIMAL(10,2) NOT NULL DEFAULT 0,
    submitted_by     VARCHAR(100) NULL,
    submitted_at     DATETIME NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_timesheets_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_timesheets_user_week UNIQUE (user_id, week_start_date),
    INDEX idx_timesheets_user (user_id),
    INDEX idx_timesheets_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
