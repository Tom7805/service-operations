-- NCL-10-CN-003: ghi nhan thanh toan cua khach hang cho tung hoa don.
-- Moi dong la mot lan thu tien. So da thu cua hoa don = SUM(amount) theo invoice_id
-- (khong luu them cot tren invoices de chi co mot nguon su that); trang thai hoa don
-- (PARTIALLY_PAID/PAID) duoc cap nhat trong cung giao dich khi ghi thanh toan.
CREATE TABLE payments (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id    BIGINT NOT NULL,
    amount        DECIMAL(18,2) NOT NULL,
    payment_date  DATE NOT NULL,
    method        VARCHAR(30) NOT NULL,
    note          VARCHAR(1000) NULL,
    created_by    VARCHAR(100) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    INDEX idx_payments_invoice (invoice_id),
    INDEX idx_payments_date (payment_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
