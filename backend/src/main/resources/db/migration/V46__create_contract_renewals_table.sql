-- Epic NCL-04, NCL-04-CN-007: Gia han hop dong.
-- Moi lan gia han la mot ban ghi bat bien, luu snapshot gia tri hop dong
-- truoc/sau de tra vet lich su (cung quy uoc voi contract_appendices o V45).
CREATE TABLE contract_renewals (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id           BIGINT NOT NULL,
    previous_end_date     DATE NOT NULL,
    new_end_date          DATE NOT NULL,
    additional_value      DECIMAL(18,2) NULL,
    value_before          DECIMAL(18,2) NOT NULL,
    value_after           DECIMAL(18,2) NOT NULL,
    notes                 VARCHAR(1000) NULL,
    created_by            VARCHAR(100) NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_renewals_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    INDEX idx_contract_renewals_contract (contract_id),
    INDEX idx_contract_renewals_new_end_date (new_end_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
