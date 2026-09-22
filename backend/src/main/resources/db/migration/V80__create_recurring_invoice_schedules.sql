-- NCL-10-CN-005: hoa don dinh ky cho hop dong duy tri (QTN-19).
-- Bang `invoices` (hoa don thuc te) da co tu V76__create_invoice_by_contract_milestone.sql; bang duoi day
-- chi luu DIEU KHOAN lap hoa don dinh ky cua tung hop dong, dung de sinh cac dong trong `invoices`.
CREATE TABLE recurring_invoice_schedules (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id            BIGINT NOT NULL,
    billing_day_of_month   INT NOT NULL,
    amount                 DECIMAL(18,2) NOT NULL,
    active                 BOOLEAN NOT NULL DEFAULT TRUE,
    last_generated_period  VARCHAR(7) NULL,
    notes                  VARCHAR(500) NULL,
    created_by             VARCHAR(100) NULL,
    created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME NULL,
    CONSTRAINT uq_recurring_schedule_contract UNIQUE (contract_id),
    CONSTRAINT fk_recurring_schedule_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT chk_recurring_schedule_day CHECK (billing_day_of_month BETWEEN 1 AND 28),
    CONSTRAINT chk_recurring_schedule_amount CHECK (amount > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
