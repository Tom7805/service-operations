-- NCL-10-CN-005: hoa don dinh ky cho hop dong duy tri (QTN-19).
-- `invoices` la bang hoa don dung chung cho Epic NCL-10; story nay chi dung nguon RECURRING,
-- cac nguon khac (TU_GIO_CONG/MOC_HOP_DONG) danh cho NCL-10-CN-001/002 bo sung sau.
CREATE TABLE invoices (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number    VARCHAR(50) NOT NULL,
    contract_id       BIGINT NOT NULL,
    customer_id       BIGINT NOT NULL,
    project_id        BIGINT NULL,
    source            VARCHAR(30) NOT NULL,
    period_start      DATE NULL,
    period_end        DATE NULL,
    issue_date        DATE NOT NULL,
    due_date          DATE NULL,
    amount            DECIMAL(18,2) NOT NULL,
    currency          VARCHAR(10) NOT NULL DEFAULT 'VND',
    status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    notes             VARCHAR(500) NULL,
    created_by        VARCHAR(100) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_invoices_number UNIQUE (invoice_number),
    CONSTRAINT fk_invoices_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT chk_invoices_amount CHECK (amount > 0),
    INDEX idx_invoices_contract (contract_id),
    INDEX idx_invoices_source (source)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Dieu khoan lap hoa don dinh ky cua mot hop dong duy tri (MAINTENANCE); moi hop dong toi da mot
-- dieu khoan dang hieu luc, khoa UNIQUE(contract_id) ngan khai bao trung.
CREATE TABLE recurring_invoice_schedules (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id            BIGINT NOT NULL,
    billing_day_of_month   INT NOT NULL,
    amount                 DECIMAL(18,2) NOT NULL,
    currency               VARCHAR(10) NOT NULL DEFAULT 'VND',
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
