-- Epic NCL-04: Quan ly hop dong
-- NCL-04-CN-001: Tao hop dong tu co hoi da thang (QTN-08)
--
-- Hop dong duoc dung san tu co hoi da thang (stage = WON) va bao giá moi nhat
-- cua co hoi do: khach hang, gia tri va noi dung bao giá lay tu quotes/quote_items,
-- nguoi dung chi bo sung cac thong tin con lai. opportunity_id la lien ket nguoc
-- ve co hoi goc de bao toan duong tu ban hang sang trien khai; rang buoc
-- UNIQUE(opportunity_id) de mot co hoi thang chi tao duoc mot hop đồng.
-- Hop dong moi khoi tao o trang thai DRAFT (dung san, cho bo sung) — cac trang
-- thai khac do cac story sau (VHDV-41..46) quan ly. quote_id ghi lai bao giá
-- dung san hop đồng de truy nguồn ve phia ban hang.
CREATE TABLE contracts (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_code       VARCHAR(50) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    opportunity_id      BIGINT NULL,
    customer_id         BIGINT NOT NULL,
    quote_id            BIGINT NULL,
    contract_type       VARCHAR(30) NOT NULL,
    total_value         DECIMAL(18,2) NOT NULL DEFAULT 0,
    start_date          DATE NULL,
    end_date            DATE NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    notes               VARCHAR(1000) NULL,
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_contracts_code (contract_code),
    UNIQUE KEY uq_contracts_opportunity (opportunity_id),
    CONSTRAINT fk_contracts_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id),
    CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_contracts_quote FOREIGN KEY (quote_id) REFERENCES quotes (id),
    INDEX idx_contracts_customer (customer_id),
    INDEX idx_contracts_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
