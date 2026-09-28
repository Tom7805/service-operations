-- NCL-10-CN-004: theo doi cong no qua han can "han thanh toan" cua tung hoa don.
-- Hoa don lap truoc migration nay chua tung khai bao han thanh toan nen mac dinh
-- invoice_date + 30 ngay (cung mac dinh voi Invoice.DEFAULT_PAYMENT_TERM_DAYS).
ALTER TABLE invoices ADD COLUMN due_date DATE NULL AFTER invoice_date;

UPDATE invoices SET due_date = DATE_ADD(invoice_date, INTERVAL 30 DAY) WHERE due_date IS NULL;

ALTER TABLE invoices MODIFY COLUMN due_date DATE NOT NULL;

-- Truy van cong no qua han loc theo trang thai roi so sanh han thanh toan.
CREATE INDEX idx_invoices_status_due_date ON invoices (status, due_date);
