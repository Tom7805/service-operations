-- NCL-02-CN-002: Chong trung ho so khach hang
-- Bo sung du lieu phuc vu so khop gan dung theo ten, ma so thue, so dien thoai
-- va luu ly do bo qua canh bao khi nguoi dung xac nhan tao moi (TC-02).

-- Bo sung cot so dien thoai de so khop (story 001 chua co cot nay).
ALTER TABLE customers
    ADD COLUMN phone VARCHAR(30) NULL AFTER address,
    ADD INDEX idx_customers_phone (phone),
    ADD INDEX idx_customers_tax_code (tax_code);

-- Log ghi ly do nguoi dung bo qua canh bao trung (TC-02).
CREATE TABLE customer_duplicate_overrides (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id     BIGINT NOT NULL,
    reason          VARCHAR(1000) NOT NULL,
    overridden_by   BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_override_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
    INDEX idx_override_customer (customer_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;