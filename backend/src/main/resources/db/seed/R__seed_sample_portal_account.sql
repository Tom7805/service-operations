-- =============================================================================
--  DỮ LIỆU NỀN — TÀI KHOẢN CỔNG KHÁCH HÀNG MẪU (NCL-13-CN-001)
-- =============================================================================
--  Chạy sau R__seed_roles_permissions.sql (cần tài khoản `khachhang01`, vai trò
--  VT-09) và R__seed_sample_customers.sql (cần khách hàng 1001) — Flyway chạy
--  migration repeatable theo thứ tự TÊN FILE nên "seed_sample_portal_account"
--  xếp sau hai file đó.
--
--  Trước Epic NCL-13, `khachhang01` chỉ có vai trò VT-09 nhưng KHÔNG gắn với khách
--  hàng nào nên cổng không có dữ liệu để xem. File này gắn tài khoản đó với
--  người liên hệ "Nguyễn Thị Nhi" của khách hàng KH-100001 (id 1001) — đăng nhập
--  `khachhang01` / `Password@123` sẽ thấy dự án, phiếu nghiệm thu, hóa đơn của
--  KH-100001 (sau khi tạo hợp đồng/dự án cho khách hàng này trên giao diện).
--
--  Người liên hệ được thêm với vai trò SECONDARY để không đụng quy tắc "chỉ một
--  đầu mối chính" (NCL-02-CN-003-TC-02) nếu khách hàng đã có đầu mối chính.
--
--  Idempotent: chỉ tạo khi chưa có (so theo email người liên hệ / user_id).
-- =============================================================================

INSERT INTO customer_contacts (customer_id, full_name, title, email, phone, role, created_by)
SELECT 1001, 'Nguyễn Thị Nhi', 'Trưởng phòng Công nghệ', 'nhi@khachhang-abc.example', '0912345679',
       'SECONDARY', 'admin'
FROM customers c
WHERE c.id = 1001
  AND NOT EXISTS (SELECT 1 FROM customer_contacts cc
                  WHERE cc.customer_id = 1001 AND cc.email = 'nhi@khachhang-abc.example');

INSERT INTO portal_accounts (user_id, customer_id, contact_id, created_by)
SELECT u.id, 1001, cc.id, 'admin'
FROM users u
JOIN customer_contacts cc ON cc.customer_id = 1001 AND cc.email = 'nhi@khachhang-abc.example'
WHERE u.username = 'khachhang01'
  AND NOT EXISTS (SELECT 1 FROM portal_accounts pa WHERE pa.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM portal_accounts pa WHERE pa.contact_id = cc.id)
LIMIT 1;
