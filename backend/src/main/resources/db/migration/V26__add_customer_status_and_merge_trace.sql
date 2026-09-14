-- NCL-02-CN-006: Gop hai ho so khach hang trung
-- Bo sung trang thai ho so khach hang (chan tiep tuc dung ho so da bi gop) va
-- cot danh dau nguon goc cho cac ban ghi duoc chuyen ve ho so giu lai khi gop (TC-02).

ALTER TABLE customers
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' AFTER phone,
    ADD COLUMN merged_into_id BIGINT NULL AFTER status,
    ADD COLUMN merged_at DATETIME NULL AFTER merged_into_id,
    ADD CONSTRAINT fk_customers_merged_into FOREIGN KEY (merged_into_id) REFERENCES customers (id),
    ADD INDEX idx_customers_status (status);

-- Ghi vet nguon goc cho ban ghi nhat ky khach hang bi chuyen sang ho so khac khi gop.
ALTER TABLE customer_audit_logs
    ADD COLUMN original_customer_id BIGINT NULL AFTER customer_id;

-- Ghi vet nguon goc cho ban ghi ly do bo qua canh bao trung bi chuyen sang ho so khac khi gop.
ALTER TABLE customer_duplicate_overrides
    ADD COLUMN original_customer_id BIGINT NULL AFTER customer_id;
