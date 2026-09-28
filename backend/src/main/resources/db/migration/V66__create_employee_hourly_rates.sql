-- NCL-07-CN-004: Khai bao chi phi gio cong noi bo cua tung nhan su theo thoi diem.
-- QTN-17: Gia von theo chi phi nhan su tai thoi diem.
CREATE TABLE employee_hourly_rates (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id         BIGINT NOT NULL,
    hourly_rate         DECIMAL(18,2) NOT NULL,
    effective_from      DATE NOT NULL,
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_hourly_rates_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
    UNIQUE KEY uq_employee_hourly_rates (employee_id, effective_from),
    INDEX idx_employee_hourly_rates_lookup (employee_id, effective_from)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

