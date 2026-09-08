-- Epic NCL-04: Quan ly hop dong
-- NCL-04-CN-003: Quan ly moc thanh toan cua hop dong
--
-- Danh sach moc thanh toan cua hop dong (ten moc, ty le/so tien, ngay du kien,
-- dieu kien nghiem thu). Moi lan luu la thay the toan bo danh sach moc cua hop
-- dong o tang service (khong them noi tiep) - tong amount phai dung bang
-- total_value cua contracts, kiem soat boi MilestoneTotalValidator (TC-01/02).
-- status mac dinh PLANNED - cac story sau (NCL-12 Nghiem thu va ban giao,
-- QTN-25) se cap nhat trang thai khi moc duoc gan voi phieu nghiem thu da ky
-- va mo khoa xuat hoa don.
CREATE TABLE contract_milestones (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id          BIGINT NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    percentage           DECIMAL(5,2) NULL,
    amount               DECIMAL(18,2) NOT NULL,
    expected_date        DATE NULL,
    acceptance_condition VARCHAR(500) NULL,
    status               VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    sort_order           INT NOT NULL DEFAULT 0,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_contract_milestones_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    INDEX idx_contract_milestones_contract (contract_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
