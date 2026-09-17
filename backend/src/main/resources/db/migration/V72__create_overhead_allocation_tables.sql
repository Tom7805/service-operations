-- NCL-08-CN-005: phan bo chi phi chung cho du an theo ty trong gio cong da duyet (QTN-29).
CREATE TABLE overhead_pools (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    period_start  DATE NOT NULL,
    period_end    DATE NOT NULL,
    total_amount  DECIMAL(18,2) NOT NULL,
    method        VARCHAR(20) NOT NULL DEFAULT 'APPROVED_HOURS',
    created_by    VARCHAR(100) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_overhead_pools_period UNIQUE (period_start),
    CONSTRAINT chk_overhead_pools_amount CHECK (total_amount > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE overhead_allocations (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    overhead_pool_id   BIGINT NOT NULL,
    project_id         BIGINT NOT NULL,
    approved_hours     DECIMAL(12,2) NOT NULL,
    allocated_amount   DECIMAL(18,2) NOT NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_overhead_allocations_pool FOREIGN KEY (overhead_pool_id) REFERENCES overhead_pools (id),
    CONSTRAINT fk_overhead_allocations_project FOREIGN KEY (project_id) REFERENCES projects (id),
    INDEX idx_overhead_allocations_pool (overhead_pool_id),
    INDEX idx_overhead_allocations_project (project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
