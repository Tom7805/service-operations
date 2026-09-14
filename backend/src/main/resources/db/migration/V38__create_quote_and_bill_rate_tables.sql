CREATE TABLE bill_rates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    professional_role VARCHAR(255) NOT NULL,
    daily_rate DECIMAL(18,2) NOT NULL,
    effective_from DATE NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bill_rates_role_effective (professional_role, effective_from),
    INDEX idx_bill_rates_lookup (professional_role, effective_from)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE quotes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT NOT NULL,
    version INT NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    created_by VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_quotes_opportunity_version (opportunity_id, version),
    CONSTRAINT fk_quotes_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id),
    INDEX idx_quotes_opportunity (opportunity_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE quote_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quote_id BIGINT NOT NULL,
    professional_role VARCHAR(255) NOT NULL,
    work_days DECIMAL(10,2) NOT NULL,
    unit_rate DECIMAL(18,2) NULL,
    amount DECIMAL(18,2) NULL,
    CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes (id),
    INDEX idx_quote_items_quote (quote_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;