-- NCL-10-CN-002: lap hoa don theo moc thanh toan cua hop dong (QTN-19).
-- Bang hoa don la nen tang chung cho cac story sau cua Epic NCL-10 (de nghi tu
-- gio cong, thanh toan, cong no, hoa don dinh ky) nen chi giu cac cot dung chung.
CREATE TABLE invoices (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_code  VARCHAR(50) NOT NULL,
    contract_id   BIGINT NOT NULL,
    customer_id   BIGINT NOT NULL,
    status        VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
    total_amount  DECIMAL(18,2) NOT NULL,
    invoice_date  DATE NOT NULL,
    note          VARCHAR(1000) NULL,
    created_by    VARCHAR(100) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_invoices_code UNIQUE (invoice_code),
    CONSTRAINT fk_invoices_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    INDEX idx_invoices_contract (contract_id),
    INDEX idx_invoices_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Moi dong hoa don la mot khoan phai thu. Hoa don theo moc co dung mot dong gan
-- voi moc thanh toan; UNIQUE(contract_milestone_id) la chot cuoi chan lap trung
-- hoa don cho cung mot moc (NULL khong bi rang buoc nen cac nguon khac khong anh huong).
CREATE TABLE invoice_lines (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id             BIGINT NOT NULL,
    contract_milestone_id  BIGINT NULL,
    description            VARCHAR(500) NOT NULL,
    amount                 DECIMAL(18,2) NOT NULL,
    CONSTRAINT fk_invoice_lines_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_lines_milestone FOREIGN KEY (contract_milestone_id) REFERENCES contract_milestones (id),
    CONSTRAINT uk_invoice_lines_milestone UNIQUE (contract_milestone_id),
    INDEX idx_invoice_lines_invoice (invoice_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
