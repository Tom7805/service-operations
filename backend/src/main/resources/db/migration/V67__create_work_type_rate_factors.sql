-- NCL-07-CN-006: He so nhan don gia theo loai hinh cong viec (binh thuong/ngoai gio/cuoi tuan/le).
-- Ap len don gia da tra (BillRate/ContractBillRate, NCL-07-CN-002/003) de ra don gia cuoi cung
-- cho mot dong gio cong cu the (NCL-07-CN-005).
CREATE TABLE work_type_rate_factors (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    work_type           VARCHAR(20) NOT NULL,
    factor              DECIMAL(6,2) NOT NULL,
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_work_type_rate_factors_work_type (work_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Gia tri mac dinh — Ke toan/Quan tri vien co the sua lai sau qua API.
INSERT INTO work_type_rate_factors (work_type, factor) VALUES
    ('NORMAL', 1.00),
    ('OVERTIME', 1.50),
    ('WEEKEND', 2.00),
    ('HOLIDAY', 3.00);

-- NCL-07-CN-006: dong gio cong ghi nhan loai hinh cong viec de tra dung he so nhan don gia.
ALTER TABLE timesheet_entries
    ADD COLUMN work_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL' AFTER billable;
