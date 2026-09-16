-- NCL-07-CN-003: Khai bao don gia rieng theo hop dong.
-- QTN-16: Don gia hop dong uu tien hon bang gia chung cong ty.
CREATE TABLE contract_bill_rates (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id         BIGINT NOT NULL,
    professional_role   VARCHAR(255) NOT NULL,
    level               VARCHAR(100) NOT NULL DEFAULT 'Chưa phân loại',
    daily_rate          DECIMAL(18,2) NOT NULL,
    effective_from      DATE NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_contract_bill_rates_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    UNIQUE KEY uq_contract_bill_rates (contract_id, professional_role, level, effective_from),
    INDEX idx_contract_bill_rates_lookup (contract_id, professional_role, level, effective_from)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

