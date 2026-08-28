-- NCL-02-CN-005: Phan nhom khach hang theo nganh va quy mo
ALTER TABLE customers
    ADD COLUMN company_size VARCHAR(50) NULL AFTER industry,
    ADD COLUMN priority VARCHAR(50) NULL AFTER company_size,
    ADD INDEX idx_customers_industry (industry),
    ADD INDEX idx_customers_company_size (company_size),
    ADD INDEX idx_customers_priority (priority);
