-- Epic NCL-02: Quan ly khach hang
-- NCL-02-CN-001: Tao ho so khach hang

CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50) NULL,
    industry VARCHAR(255) NULL,
    address VARCHAR(500) NULL,
    created_by VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
