-- NCL-02-CN-006 (TC-04): Nhat ky chi tiet cac lan gop hai ho so khach hang trung.
-- Luu snapshot ma/ten cua ca hai ho so vi ho so bi gop se chuyen sang trang thai
-- MERGED ngay sau khi ghi ban ghi nay.
CREATE TABLE customer_merge_logs (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_customer_id    BIGINT NOT NULL,
    source_customer_code  VARCHAR(20) NULL,
    source_customer_name  VARCHAR(255) NULL,
    target_customer_id    BIGINT NOT NULL,
    target_customer_code  VARCHAR(20) NULL,
    target_customer_name  VARCHAR(255) NULL,
    moved_record_summary  VARCHAR(1000) NULL,
    performed_by          BIGINT NOT NULL,
    performed_by_username VARCHAR(100) NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_merge_log_source FOREIGN KEY (source_customer_id) REFERENCES customers (id),
    CONSTRAINT fk_merge_log_target FOREIGN KEY (target_customer_id) REFERENCES customers (id),
    INDEX idx_merge_log_source (source_customer_id),
    INDEX idx_merge_log_target (target_customer_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
