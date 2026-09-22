-- NCL-10-CN-001: de nghi xuat hoa don tu gio cong da duyet (QTN-18).
-- Ke toan chon du an va ky; he thong gom cac dong gio cong da duyet, co tinh phi va chua tung nam trong mot
-- de nghi khac (cung voi chi phi da duyet duoc danh dau tinh lai cho khach hang - NCL-08-CN-003) thanh mot de nghi.
CREATE TABLE invoice_proposals (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    proposal_code   VARCHAR(50) NOT NULL,
    project_id      BIGINT NOT NULL,
    contract_id     BIGINT NOT NULL,
    customer_id     BIGINT NOT NULL,
    period_from     DATE NOT NULL,
    period_to       DATE NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    labor_amount    DECIMAL(18,2) NOT NULL,
    expense_amount  DECIMAL(18,2) NOT NULL,
    total_amount    DECIMAL(18,2) NOT NULL,
    note            VARCHAR(1000) NULL,
    created_by      VARCHAR(100) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_invoice_proposals_code UNIQUE (proposal_code),
    CONSTRAINT fk_invoice_proposals_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_invoice_proposals_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_invoice_proposals_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    INDEX idx_invoice_proposals_project (project_id),
    INDEX idx_invoice_proposals_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Moi dong la mot khoan phai thu: dong GIO CONG (time_entry_id) hoac dong CHI PHI tinh lai (project_expense_id).
-- UNIQUE(time_entry_id) / UNIQUE(project_expense_id) la chot cuoi chan mot dong gio cong hay mot phieu chi phi
-- nam trong hai de nghi (QTN-18: "chua tung xuat hoa don"); NULL khong bi rang buoc nen hai nhom khong anh huong nhau.
-- Neu sau nay co chuc nang huy de nghi, phai xoa cac dong cua de nghi bi huy de tra dong gio cong ve trang thai chua xuat.
CREATE TABLE invoice_proposal_lines (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_proposal_id BIGINT NOT NULL,
    line_type           VARCHAR(20) NOT NULL,
    time_entry_id       BIGINT NULL,
    project_expense_id  BIGINT NULL,
    line_date           DATE NOT NULL,
    user_id             BIGINT NULL,
    hours               DECIMAL(10,2) NULL,
    unit_rate           DECIMAL(18,4) NULL,
    description         VARCHAR(500) NOT NULL,
    amount              DECIMAL(18,2) NOT NULL,
    CONSTRAINT fk_ipl_proposal FOREIGN KEY (invoice_proposal_id) REFERENCES invoice_proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_ipl_time_entry FOREIGN KEY (time_entry_id) REFERENCES timesheet_entries (id),
    CONSTRAINT fk_ipl_expense FOREIGN KEY (project_expense_id) REFERENCES project_expenses (id),
    CONSTRAINT uk_ipl_time_entry UNIQUE (time_entry_id),
    CONSTRAINT uk_ipl_expense UNIQUE (project_expense_id),
    INDEX idx_ipl_proposal (invoice_proposal_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
