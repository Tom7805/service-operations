-- =============================================================================
--  DỮ LIỆU NỀN — HỒ SƠ KHÁCH HÀNG MẪU (NCL-02-CN-001)
-- =============================================================================
--  Chạy SAU CÙNG trong chuỗi seed: Flyway chạy migration repeatable (R__) theo
--  thứ tự TÊN FILE (xem R__seed_departments.sql) — "seed_sample_customers" xếp
--  sau "seed_roles_permissions" vì cần bảng `users` đã có sẵn (owner_id là
--  khóa ngoại tới users.id, gán theo đúng người tạo/phụ trách).
--
--  Mục đích kép:
--   1. Có sẵn vài hồ sơ để xem giao diện danh sách/chi tiết ngay khi mới clone,
--      không phải tự tạo tay.
--   2. Minh chứng SỐNG cho pham vi DEPARTMENT/SELF (QTN-01) đã sửa ở
--      CustomerServiceImpl — cố ý rải owner_id cho NHIỀU người khác phòng
--      (sale01/sale.lead ở phòng 3, pm01/pm.lead ở phòng 2) để khi đăng nhập
--      từng tài khoản, danh sách "Khách hàng" hiện đúng phạm vi từng người
--      (xem kịch bản kiểm thử VHDV-64-TC-02).
--
--  Mã số thuế: đúng 10 chữ số (một số kèm "-001" mô phỏng chi nhánh) — khớp
--  ràng buộc @Pattern mới thêm ở CustomerCreateReq. Số điện thoại: đúng đầu số
--  di động đang cấp phép hoặc mã vùng cố định 02x — khớp ràng buộc tương ứng.
--
--  2 hồ sơ đầu đã gán sẵn ngành/quy mô/ưu tiên (company_size, priority) để
--  minh hoạ tab "Phân nhóm" (NCL-02-CN-005) — các hồ sơ còn lại cố ý để trống
--  hai cột này, đúng trạng thái "chưa phân nhóm" sau khi vừa tạo.
--
--  Idempotent qua ON DUPLICATE KEY UPDATE (khóa theo `code`, đã UNIQUE).
-- ----------------------------------------------------------------------------
INSERT INTO customers (id, code, name, tax_code, phone, industry, company_size, priority, address, created_by, owner_id, created_at)
SELECT c.id, c.code, c.name, c.tax_code, c.phone, c.industry, c.company_size, c.priority, c.address, c.owner_username, u.id, c.created_at
FROM (
              SELECT 1001 AS id, 'KH-100001' AS code, 'Công ty CP Giải Pháp Số Việt' AS name,
                     '0101234561' AS tax_code, '0912345671' AS phone,
                     'Công nghệ thông tin' AS industry, 'Vừa' AS company_size, 'Cao' AS priority,
                     'Số 12 Láng Hạ, Đống Đa, Hà Nội' AS address,
                     'sale01' AS owner_username, '2025-11-03 09:15:00' AS created_at
    UNION ALL SELECT 1002, 'KH-100002', 'Công ty TNHH Thương Mại Miền Bắc',
                     '0101234562', '0987654322',
                     'Bán lẻ & phân phối', 'Nhỏ', 'Trung bình',
                     '45 Trần Duy Hưng, Cầu Giấy, Hà Nội',
                     'sale01', '2025-11-10 14:30:00'
    UNION ALL SELECT 1003, 'KH-100003', 'Công ty CP Đầu Tư Xây Dựng An Phát',
                     '0101234563-001', '0977123456',
                     'Xây dựng', NULL, NULL,
                     '78 Nguyễn Trãi, Thanh Xuân, Hà Nội',
                     'sale.lead', '2025-11-18 10:00:00'
    UNION ALL SELECT 1004, 'KH-100004', 'Tập Đoàn Công Nghệ Sao Việt',
                     '0102345671', '0938123456',
                     'Công nghệ thông tin', NULL, NULL,
                     '199 Điện Biên Phủ, Quận 3, TP. Hồ Chí Minh',
                     'pm01', '2025-12-01 08:45:00'
    UNION ALL SELECT 1005, 'KH-100005', 'Công ty TNHH Dịch Vụ Logistics Toàn Cầu',
                     '0102345672', '02438123456',
                     'Vận tải & Logistics', NULL, NULL,
                     'Khu công nghiệp Sài Đồng, Long Biên, Hà Nội',
                     'pm.lead', '2025-12-08 16:20:00'
    UNION ALL SELECT 1006, 'KH-100006', 'Công ty CP Tư Vấn Tài Chính Kế Toán Minh Đức',
                     '0103456781', '0915678234',
                     'Tư vấn tài chính - kế toán', NULL, NULL,
                     '25 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
                     'ketoan01', '2025-12-15 11:10:00'
) c
JOIN users u ON u.username = c.owner_username
ON DUPLICATE KEY UPDATE
    name          = VALUES(name),
    tax_code      = VALUES(tax_code),
    phone         = VALUES(phone),
    industry      = VALUES(industry),
    company_size  = VALUES(company_size),
    priority      = VALUES(priority),
    address       = VALUES(address),
    created_by    = VALUES(created_by),
    owner_id      = VALUES(owner_id);
