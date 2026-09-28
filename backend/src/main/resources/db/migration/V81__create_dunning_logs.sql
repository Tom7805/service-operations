-- NCL-10-CN-006: nhac thu no tu dong (QTN-27 - khong gui trung mot thong bao).
-- Moi dong la MOT lan nhac da gui cho MOT hoa don o MOT moc cu the (truoc han/dung han/qua han theo
-- chu ky); UNIQUE(invoice_id, stage, reference_date) la chot chan gui trung khi tac vu chay lai nhieu
-- lan trong cung ngay (TC-02) - doc lap voi bang notifications (noi luu tung thong bao gui cho tung
-- nguoi nhan), day la "lich su nhac no" rieng cua tung hoa don.
CREATE TABLE dunning_logs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id        BIGINT NOT NULL,
    stage             VARCHAR(30) NOT NULL,
    reference_date    DATE NOT NULL,
    days_overdue      INT NULL,
    remaining_amount  DECIMAL(18,2) NOT NULL,
    recipient_ids     VARCHAR(500) NOT NULL,
    sent_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dunning_logs_cycle UNIQUE (invoice_id, stage, reference_date),
    CONSTRAINT fk_dunning_logs_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    INDEX idx_dunning_logs_invoice (invoice_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
