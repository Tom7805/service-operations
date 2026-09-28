-- Epic NCL-13: Cong khach hang.
-- V12 (placeholder rong) da duoc ap tren CSDL cua ca nhom nen khong sua lai (doi checksum se lam
-- Flyway validate that bai); bang cua Epic nay tao o day — cung cach V83 lam voi V11.

-- NCL-13-CN-001: tai khoan cong cap cho MOT nguoi lien he cua MOT khach hang (QTN-26).
--  * user_id    : tai khoan dang nhap (bang users, vai tro VT-09, pham vi SELF). Trang thai dang nhap
--                 (ACTIVE / LOCKED) doc tu users.status — mot nguon su that duy nhat, khoa o day hay o
--                 man hinh Quan ly tai khoan deu cho cung ket qua.
--  * customer_id: khach hang ma tai khoan duoc phep xem du lieu. Chot tai thoi diem cap, khong doi.
--  * contact_id : moi nguoi lien he toi da mot tai khoan cong (TC-01).
-- Khoa tai khoan (TC-02) khong xoa dong nao: du lieu va lich su giu nguyen, chi luu ly do va nguoi khoa.
CREATE TABLE portal_accounts (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    customer_id         BIGINT NOT NULL,
    contact_id          BIGINT NOT NULL,
    status_reason       VARCHAR(500) NULL,
    status_changed_by   VARCHAR(100) NULL,
    status_changed_at   DATETIME NULL,
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_portal_accounts_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_portal_accounts_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_portal_accounts_contact FOREIGN KEY (contact_id) REFERENCES customer_contacts (id),
    CONSTRAINT uq_portal_accounts_user UNIQUE (user_id),
    CONSTRAINT uq_portal_accounts_contact UNIQUE (contact_id),
    INDEX idx_portal_accounts_customer (customer_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
