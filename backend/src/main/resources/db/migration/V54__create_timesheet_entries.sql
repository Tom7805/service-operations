-- NCL-06-CN-001: ghi gio cong theo cong viec (Epic NCL-06 - Bang cham cong).
-- Moi ban ghi la gio cong cua mot nhan su (user_id) tren mot cong viec (task_id)
-- trong mot ngay lam viec (work_date). Gio cong chi tinh vao approved_hours cua
-- task sau khi duoc duyet (NCL-06 phan duyet); ban ghi moi tao o trang thai DRAFT.
CREATE TABLE timesheet_entries (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id       BIGINT NOT NULL,
    user_id       BIGINT NOT NULL,
    work_date     DATE NOT NULL,
    hours         DECIMAL(10,2) NOT NULL,
    entry_status  VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    note          VARCHAR(1000) NULL,
    created_by    VARCHAR(100) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_timesheet_entries_task FOREIGN KEY (task_id) REFERENCES project_tasks (id),
    CONSTRAINT fk_timesheet_entries_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_timesheet_entries_user_task_date UNIQUE (user_id, task_id, work_date),
    INDEX idx_timesheet_entries_task (task_id),
    INDEX idx_timesheet_entries_user_date (user_id, work_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
