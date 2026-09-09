-- NCL-05-CN-008: Quan ly moc tien do cua du an.
CREATE TABLE project_milestones (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id   BIGINT NOT NULL,
    name         VARCHAR(255) NOT NULL,
    description  TEXT NULL,
    planned_date DATE NOT NULL,
    actual_date  DATE NULL,
    created_by   VARCHAR(100) NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_milestones_project (project_id),
    CONSTRAINT fk_project_milestones_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Hang muc phai hoan thanh cua moc: lien ket voi cong viec (Task) trong cay cong viec.
CREATE TABLE project_milestone_items (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    milestone_id BIGINT NOT NULL,
    task_id      BIGINT NOT NULL,
    UNIQUE KEY uq_project_milestone_items (milestone_id, task_id),
    INDEX idx_project_milestone_items_task (task_id),
    CONSTRAINT fk_milestone_items_milestone FOREIGN KEY (milestone_id) REFERENCES project_milestones (id),
    CONSTRAINT fk_milestone_items_task FOREIGN KEY (task_id) REFERENCES project_tasks (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
