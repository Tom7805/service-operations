-- Co hoi kinh doanh (Opportunities) va pipeline ban hang theo giai doan (stage).
CREATE TABLE opportunities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    customer_id BIGINT NOT NULL,
    owner_user_id BIGINT NULL,
    stage VARCHAR(20) NOT NULL DEFAULT 'NEW',
    amount DECIMAL(15,2) NULL,
    expected_close_date DATE NULL,
    note VARCHAR(1000) NULL,
    created_by VARCHAR(100) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    CONSTRAINT fk_opportunities_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_opportunities_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_customer ON opportunities(customer_id);
