-- Epic NCL-04, NCL-04-CN-004: Lap phu luc dieu chinh hop dong.
-- Moi phu luc la mot ban ghi bat bien; gia tri hop dong sau dieu chinh duoc
-- luu snapshot de truy vet lich su va tranh tinh lai sai khi xem lai du lieu.
CREATE TABLE contract_appendices (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id           BIGINT NOT NULL,
    content               VARCHAR(1000) NOT NULL,
    adjustment_value      DECIMAL(18,2) NOT NULL,
    value_before          DECIMAL(18,2) NOT NULL,
    value_after           DECIMAL(18,2) NOT NULL,
    effective_date        DATE NOT NULL,
    created_by            VARCHAR(100) NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_appendices_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    INDEX idx_contract_appendices_contract (contract_id),
    INDEX idx_contract_appendices_effective_date (effective_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;