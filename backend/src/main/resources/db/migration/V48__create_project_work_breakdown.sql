-- NCL-05-CN-002: cay hang muc va cong viec nhieu cap.
CREATE TABLE work_packages (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    parent_id   BIGINT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    created_by  VARCHAR(100) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_work_packages_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_work_packages_parent FOREIGN KEY (parent_id) REFERENCES work_packages (id),
    INDEX idx_work_packages_project (project_id),
    INDEX idx_work_packages_parent (parent_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE project_tasks (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id          BIGINT NOT NULL,
    work_package_id     BIGINT NOT NULL,
    parent_task_id      BIGINT NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT NULL,
    expected_start_date DATE NULL,
    expected_end_date   DATE NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'TODO',
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_project_tasks_package FOREIGN KEY (work_package_id) REFERENCES work_packages (id),
    CONSTRAINT fk_project_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES project_tasks (id),
    INDEX idx_project_tasks_project (project_id),
    INDEX idx_project_tasks_package (work_package_id),
    INDEX idx_project_tasks_parent (parent_task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;