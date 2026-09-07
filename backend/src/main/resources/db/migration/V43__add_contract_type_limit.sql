-- Epic NCL-04: Quan ly hop dong
-- NCL-04-CN-002: Khai bao loai hop dong va han muc (QTN-19)
--
-- Han muc tran (limit_value) la gioi han gia tri xuat hoa don tren hop dong,
-- do Ke toan (VT-05) khai bao sau khi hop dong duoc tao (dieu kien bat dau:
-- hop dong da ton tai). NULL = khong dat han muc ("neu co"). Rang buoc
-- limit_value >= 0 va limit_value >= total_value kiem soat o tang service
-- (TC-02, QTN-19: khong xuat hoa don vuot gia tri hop dong) — giong quy uoc
-- cua V35: rang buoc gia tri khong am khong dat o tang DB.
--
-- contract_audit_logs: nhat ky rieng cua module hop dong (TC-04) - nguoi thuc
-- hien, hanh dong, noi dung va thoi diem moi lan khai bao/sua doi. Tach khoi
-- opportunity_audit_logs vi hop dong co the khong phat sinh tu co hoi
-- (opportunity_id NULL), cau truc giong het ban goc va them actor_role
-- (dong bo voi V41).
ALTER TABLE contracts
    ADD COLUMN limit_value DECIMAL(18,2) NULL AFTER total_value,
    ADD INDEX idx_contracts_limit (limit_value);

CREATE TABLE contract_audit_logs (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id       BIGINT NULL,
    action_type       VARCHAR(30) NOT NULL,
    detail            VARCHAR(1000) NULL,
    actor_id          BIGINT NULL,
    actor_username    VARCHAR(100) NULL,
    actor_role        VARCHAR(20) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contract_audit_contract (contract_id),
    INDEX idx_contract_audit_actor (actor_id),
    INDEX idx_contract_audit_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
