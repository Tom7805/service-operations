-- NCL-06-CN-008: phien dong ho bam gio dang chay cua nhan su.
CREATE TABLE timesheet_timers (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    task_id    BIGINT       NOT NULL,
    started_at DATETIME     NOT NULL,
    note       VARCHAR(1000) NOT NULL,
    billable   BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_timesheet_timers_user UNIQUE (user_id),
    CONSTRAINT fk_timesheet_timers_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_timesheet_timers_task FOREIGN KEY (task_id) REFERENCES project_tasks (id),
    INDEX idx_timesheet_timers_task (task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
