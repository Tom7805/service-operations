-- NCL-05-CN-009: Quan ly rui ro cua du an.
-- Diem rui ro (score) va muc do (severity) KHONG luu DB — tinh dong tu impact x likelihood.
CREATE TABLE project_risks (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    description TEXT NOT NULL,
    impact      VARCHAR(10) NOT NULL,
    likelihood  VARCHAR(10) NOT NULL,
    mitigation  TEXT NULL,
    watcher_id  BIGINT NOT NULL,
    status      VARCHAR(15) NOT NULL DEFAULT 'OPEN',
    created_by  VARCHAR(100) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_risks_project (project_id),
    INDEX idx_project_risks_watcher (watcher_id),
    CONSTRAINT fk_project_risks_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_project_risks_watcher FOREIGN KEY (watcher_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
