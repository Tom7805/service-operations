-- Du lieu mo phong: 9 vai tro theo backlog (Muc 2) + 1 tai khoan demo de kiem thu dang nhap (NCL-01-CN-001)

INSERT INTO roles (code, name, description) VALUES
    ('VT-01', 'Ban giam doc', 'Nguoi dieu hanh cong ty, theo doi suc khoe tai chinh va nang luc toan cong ty'),
    ('VT-02', 'Quan ly du an', 'Nguoi chiu trach nhiem mot hoac nhieu du an tu luc khoi dong toi luc dong'),
    ('VT-03', 'Nhan vien chuyen mon', 'Nguoi truc tiep thuc hien cong viec cua du an va ghi nhan gio cong'),
    ('VT-04', 'Nhan vien kinh doanh', 'Nguoi tim khach hang, theo duoi co hoi va dua hop dong ve cong ty'),
    ('VT-05', 'Ke toan', 'Nguoi lap hoa don, theo doi thanh toan va doi chieu doanh thu voi chi phi'),
    ('VT-06', 'Nhan su', 'Nguoi quan ly ho so nhan su, hop dong lao dong, ngay le va chi phi luong'),
    ('VT-07', 'Quan tri vien', 'Nguoi quan tri he thong, tai khoan, cay to chuc va phan quyen'),
    ('VT-08', 'Nhan vien cong ty', 'Cach goi chung cho moi vai tro khi noi toi cac chuc nang dung chung'),
    ('VT-09', 'Khach hang', 'Dai dien phia khach hang duoc cap tai khoan de theo doi du an cua minh')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- Tai khoan demo: admin / Password@123 (bcrypt), gan vai tro Quan tri vien, pham vi toan cong ty
INSERT INTO users (username, password_hash, full_name, email, status)
SELECT 'admin', '$2b$10$9RL/bjC8S5hpxlpSDCrhO.f5ALK15DnyexpdEbc.hy2ouUJk0DUtK', 'Quan tri vien demo', 'admin@service-operations.local', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO user_role_scopes (user_id, role_id, scope_type)
SELECT u.id, r.id, 'COMPANY'
FROM users u
JOIN roles r ON r.code = 'VT-07'
WHERE u.username = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM user_role_scopes urs WHERE urs.user_id = u.id AND urs.role_id = r.id
  );

-- Tai khoan demo: nhansu / Password@123, vai tro Nhan su (VT-06), pham vi toan cong ty.
-- Dung de kiem thu cac man hinh chi Nhan su/Ke toan/Ban giam doc duoc xem (vi du NCL-01-CN-005
-- che du lieu luong va gia von) - tai khoan admin (VT-07) khong nam trong nhom nay nen khong
-- du de kiem thu day du luong thanh cong cua cac man hinh do.
INSERT INTO users (username, password_hash, full_name, email, status)
SELECT 'nhansu', '$2b$10$9RL/bjC8S5hpxlpSDCrhO.f5ALK15DnyexpdEbc.hy2ouUJk0DUtK', 'Nhan su demo', 'nhansu@service-operations.local', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'nhansu');

INSERT INTO user_role_scopes (user_id, role_id, scope_type)
SELECT u.id, r.id, 'COMPANY'
FROM users u
JOIN roles r ON r.code = 'VT-06'
WHERE u.username = 'nhansu'
  AND NOT EXISTS (
      SELECT 1 FROM user_role_scopes urs WHERE urs.user_id = u.id AND urs.role_id = r.id
  );
