-- NCL-05-CN-003: giao mot cong viec cho mot hoac nhieu nhan su.
CREATE TABLE project_task_assignments (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id              BIGINT NOT NULL,
    user_id              BIGINT NOT NULL,
    expected_start_date  DATE NULL,
    expected_end_date    DATE NULL,
    created_by           VARCHAR(100) NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_task_assignments_task FOREIGN KEY (task_id) REFERENCES project_tasks (id),
    CONSTRAINT fk_project_task_assignments_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_project_task_assignments_task_user UNIQUE (task_id, user_id),
    INDEX idx_project_task_assignments_task (task_id),
    INDEX idx_project_task_assignments_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;