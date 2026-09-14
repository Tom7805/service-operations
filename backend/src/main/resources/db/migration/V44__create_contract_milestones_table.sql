-- NCL-04-CN-003: Quan ly moc thanh toan cua hop dong (QTN-19)
CREATE TABLE contract_milestones (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id           BIGINT NOT NULL,
    name                  VARCHAR(255) NOT NULL,
    percentage            DECIMAL(5,2) NULL,
    amount                DECIMAL(18,2) NOT NULL,
    expected_date         DATE NULL,
    acceptance_condition  VARCHAR(1000) NULL,
    status                VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_by            VARCHAR(100) NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_milestones_contract FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
    INDEX idx_contract_milestones_contract (contract_id),
    INDEX idx_contract_milestones_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;