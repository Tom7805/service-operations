-- Epic NCL-04: Quan ly hop dong
-- NCL-04-CN-004: Lap phu luc dieu chinh hop dong
--
-- Phu luc ghi nhan moi lan dieu chinh gia tri va/hoac thoi han cua hop dong sau
-- khi da duoc khai bao (NCL-04-CN-002). Moi dong luu ca gia tri cu (old_*) va
-- gia tri moi (new_*) de giu vet lich su dieu chinh - khac voi mocs thanh toan
-- (contract_milestones) la thay the toan bo, phu luc la THEM NOI TIEP (khong
-- xoa phu luc cu). amendment_no sinh tu dong o tang service (PL-<ma hop dong>-NN).
-- effective_date la ngay hieu luc cua phu luc, co the khac voi ngay tao.
-- old_total_value/new_total_value hoac old_end_date/new_end_date co the NULL
-- dong thoi tuy theo noi dung dieu chinh, nhung it nhat mot cap phai khac NULL
-- (kiem soat o tang service - TC-02).
CREATE TABLE contract_amendments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id      BIGINT NOT NULL,
    amendment_no     VARCHAR(50) NOT NULL,
    reason           VARCHAR(500) NOT NULL,
    old_total_value  DECIMAL(18,2) NULL,
    new_total_value  DECIMAL(18,2) NULL,
    old_end_date     DATE NULL,
    new_end_date     DATE NULL,
    effective_date   DATE NOT NULL,
    notes            VARCHAR(1000) NULL,
    created_by       VARCHAR(100) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_contract_amendments_no (amendment_no),
    CONSTRAINT fk_contract_amendments_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    INDEX idx_contract_amendments_contract (contract_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
