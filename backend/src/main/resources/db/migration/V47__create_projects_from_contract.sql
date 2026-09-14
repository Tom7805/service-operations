-- Epic NCL-05: Quan ly du an
-- NCL-05-CN-001: Tao du an tu hop dong con hieu luc.
CREATE TABLE projects (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_code        VARCHAR(50) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    contract_id         BIGINT NOT NULL,
    customer_id         BIGINT NOT NULL,
    project_type        VARCHAR(30) NOT NULL,
    limit_value         DECIMAL(18,2) NULL,
    start_date          DATE NOT NULL,
    expected_end_date   DATE NOT NULL,
    project_manager_id  BIGINT NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_projects_code (project_code),
    CONSTRAINT fk_projects_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_projects_manager FOREIGN KEY (project_manager_id) REFERENCES users (id),
    INDEX idx_projects_contract (contract_id),
    INDEX idx_projects_customer (customer_id),
    INDEX idx_projects_manager (project_manager_id),
    INDEX idx_projects_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE project_audit_logs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id        BIGINT NULL,
    contract_id       BIGINT NULL,
    action_type       VARCHAR(40) NOT NULL,
    detail            VARCHAR(1000) NULL,
    actor_id          BIGINT NULL,
    actor_username    VARCHAR(100) NULL,
    actor_role        VARCHAR(20) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_audit_project (project_id),
    INDEX idx_project_audit_contract (contract_id),
    INDEX idx_project_audit_actor (actor_id),
    INDEX idx_project_audit_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;