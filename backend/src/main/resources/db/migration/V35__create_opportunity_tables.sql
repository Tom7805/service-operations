-- Epic NCL-03: Co hoi ban hang
-- NCL-03-CN-001: Tao co hoi ban hang
--
-- Bang chu dao cho pipeline ban hang. Moi co hoi bat buoc gan voi mot
-- khach hang DA CO ho so trong he thong (customer_id NOT NULL) — dieu kien
-- bat dau cua story (phu thuoc NCL-02-CN-001). Gia tri du kien (expected_value)
-- la so thap phan duong, rang buoc khong am duoc kiem soat o tang service
-- (TC-02). Giai doan (stage) khoi tao = giai doan dau tien (tiep can), dua
-- theo QTN-06 (chuyen giai doan theo thu tu).
CREATE TABLE opportunities (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    customer_id         BIGINT NOT NULL,
    expected_value      DECIMAL(18,2) NOT NULL DEFAULT 0,
    expected_close_date DATE NULL,
    owner_id            BIGINT NULL,
    stage               VARCHAR(30) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_opportunities_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_opportunities_owner FOREIGN KEY (owner_id) REFERENCES users (id),
    INDEX idx_opportunities_customer (customer_id),
    INDEX idx_opportunities_owner (owner_id),
    INDEX idx_opportunities_stage (stage)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;