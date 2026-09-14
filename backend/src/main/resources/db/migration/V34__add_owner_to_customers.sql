-- NCL-02-CN-001 / QTN-01: pham vi du lieu DEPARTMENT/SELF cho module Khach hang.
--
-- Truoc migration nay, bang `customers` chi co `created_by` (VARCHAR ten dang
-- nhap) — khong co cach nao tinh "khach hang nay thuoc pham vi ai" o tang du
-- lieu, nen CustomerServiceImpl.findAll() tra ve TOAN BO danh sach cho MOI vai
-- tro bat ke pham vi DEPARTMENT hay SELF cua ho la gi (phat hien qua kiem thu
-- thu cong TC-02 — sale.lead va sale01 thay giong het nhau, khong dung QTN-01).
--
-- Them `owner_id` (nguoi phu trach — mac dinh la nguoi tao ho so) lam khoa
-- ngoai toi `users.id`. Phong ban cua khach hang duoc TINH GIAN TIEP tu
-- `users.department_id` cua chu so huu tai thoi diem truy van (khong luu lap
-- lai ngay tren customers) — nguoi phu trach doi phong ban thi pham vi cap
-- nhat ngay theo, khong con du lieu cu.
ALTER TABLE customers
    ADD COLUMN owner_id BIGINT NULL AFTER created_by,
    ADD CONSTRAINT fk_customers_owner FOREIGN KEY (owner_id) REFERENCES users (id),
    ADD INDEX idx_customers_owner (owner_id);

-- Ho so da co san (seed hoac da tao truoc do): suy owner_id tu created_by
-- (ten dang nhap) bang cach khop voi bang users. Ho so co created_by khong
-- khop tai khoan nao (vi du du lieu nhap tay/import) se giu owner_id NULL —
-- CustomerServiceImpl coi la "khong xac dinh nguoi phu trach", bi loai khoi
-- ket qua khi nguoi xem co pham vi SELF hoac DEPARTMENT (an toan hon la lo
-- nham cho nguoi khong lien quan).
UPDATE customers c
JOIN users u ON u.username = c.created_by
SET c.owner_id = u.id
WHERE c.owner_id IS NULL;
