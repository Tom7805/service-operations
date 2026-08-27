-- NCL-02-CN-003: Quan ly nguoi lien he cua khach hang
-- Moi khach hang co the co nhieu nguoi lien he, nhung chi duy nhat mot
-- dau moi chinh (role = PRIMARY) tai mot thoi diem (TC-02); duoc kiem soat
-- o tang service, giong quy uoc chong trung ho so khach hang o V20.

CREATE TABLE customer_contacts (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    title       VARCHAR(255) NULL,
    email       VARCHAR(255) NULL,
    phone       VARCHAR(30) NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'SECONDARY',
    created_by  VARCHAR(100) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_contacts_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
    INDEX idx_customer_contacts_customer (customer_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
