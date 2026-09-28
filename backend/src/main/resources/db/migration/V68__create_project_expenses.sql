-- NCL-08-CN-001: ghi nhan chi phi phat sinh cua du an.
CREATE TABLE project_expenses (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id    BIGINT NOT NULL,
    user_id       BIGINT NOT NULL,
    expense_type  VARCHAR(20) NOT NULL,
    amount        DECIMAL(18,2) NOT NULL,
    expense_date  DATE NOT NULL,
    description   VARCHAR(1000) NOT NULL,
    receipt_url   VARCHAR(500) NULL,
    billable      BOOLEAN NOT NULL DEFAULT FALSE,
    status        VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    created_by    VARCHAR(100) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_expenses_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_project_expenses_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT chk_project_expenses_amount CHECK (amount > 0),
    INDEX idx_project_expenses_project (project_id),
    INDEX idx_project_expenses_user (user_id),
    INDEX idx_project_expenses_date (expense_date),
    INDEX idx_project_expenses_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;