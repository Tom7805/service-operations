-- =============================================================================
--  DỮ LIỆU NỀN (3/3) — TÀI KHOẢN, PHÂN VAI TRÒ + PHẠM VI, NHÂN SỰ
-- =============================================================================
--  Chạy sau R__seed_departments.sql + R__seed_reference_data.sql
--  (cần đủ bảng `roles` và `departments`).
--  Xem đầu R__seed_departments.sql để biết toàn bộ chuỗi seed 3 file.
--
--  MẬT KHẨU MỌI TÀI KHOẢN DEMO: Password@123   (bcrypt, cùng một hash bên dưới)
--
--  Nguyên tắc "đúng đắn logic" áp dụng cho bộ dữ liệu này:
--    1. Vai trò (VT-xx)  = quyền hạn CHỨC NĂNG trong hệ thống.
--    2. Phòng ban        = vị trí trong CÂY TỔ CHỨC, dùng để giới hạn phạm vi
--                          dữ liệu (COMPANY / DEPARTMENT / SELF — QTN-01).
--       → Hai trục ĐỘC LẬP: một phòng chứa nhiều vai trò; một vai trò rải nhiều phòng.
--    3. "Nhân viên chuyên môn" (VT-03) thuộc Phòng Công nghệ & Giải pháp và các
--       Tổ/Nhóm con của nó (id 6..9).
--    4. VT-07 (Quản trị viên) là vai trò xuyên suốt — đặt tại Phòng Công nghệ &
--       Giải pháp nhưng KHÔNG có hồ sơ trong `employees` (không phải nhân sự nghiệp vụ).
--    5. VT-08 KHÔNG gán cho ai (chỉ là tên gọi chung).
--    6. VT-09 (Khách hàng) nằm NGOÀI cây tổ chức: department_id = NULL, phạm vi SELF,
--       không có hồ sơ nhân sự.
--
--  Idempotent:
--    - users              : INSERT ... ON DUPLICATE KEY UPDATE — mỗi lần chạy seed
--                           KHÔI PHỤC các tài khoản demo về trạng thái đăng nhập được:
--                           đặt lại mật khẩu = Password@123, status = ACTIVE, gỡ khóa
--                           tạm (failed_login_attempts = 0, locked_until = NULL).
--    - user_role_scopes   : ON DUPLICATE KEY UPDATE theo khóa (user_id, role_id).
--    - departments.manager_id / employees / employment_contracts : chỉ tạo/gán khi chưa có.
-- =============================================================================

-- ----------------------------------------------------------------------------
--  1) TÀI KHOẢN
--
--  user                | Họ tên               | Phòng | Vai trò | Phạm vi dữ liệu
--  --------------------|----------------------|-------|---------|------------------
--  admin               | Quản trị viên hệ thống| 6 TCN | VT-07   | COMPANY
--  giamdoc             | Lê Minh Quân         | 1 BGD | VT-01   | COMPANY
--  pm.lead             | Trần Thu Hà          | 2 PMO | VT-02   | DEPARTMENT → 2 (PMO)
--  pm01                | Nguyễn Văn Dũng      | 2 PMO | VT-02   | SELF
--  sale.lead           | Phạm Quốc Bảo        | 3 KDH | VT-04   | DEPARTMENT → 3 (KDH)
--  sale01              | Đỗ Thị Mai           | 3 KDH | VT-04   | SELF
--  ketoan.lead         | Vũ Thị Lan           | 4 KTT | VT-05   | COMPANY
--  ketoan01            | Hoàng Văn Nam        | 4 KTT | VT-05   | COMPANY
--  nhansu              | Nguyễn Thị Hương     | 5 NSU | VT-06   | COMPANY
--  hr01                | Bùi Thị Thảo         | 5 NSU | VT-06   | COMPANY
--  tcn.director        | Đặng Hoàng Long      | 6 TCN | VT-02   | DEPARTMENT → 6 (TCN + con cháu)
--  dev.lead            | Ngô Thanh Tùng       | 7     | VT-03   | SELF
--  dev01               | Lý Văn Cường         | 7     | VT-03   | SELF
--  dev02               | Trịnh Thị Thu        | 7     | VT-03   | SELF  (BÁN THỜI GIAN — 20h/tuần)
--  consult.lead        | Mai Quang Huy        | 8     | VT-03   | SELF
--  qa.lead             | Phan Thị Nga         | 9     | VT-03   | SELF
--  khachhang01         | Nguyễn Thị Nhi       | (—)   | VT-09   | SELF
-- ----------------------------------------------------------------------------
INSERT INTO users (username, password_hash, full_name, email, department_id, status)
SELECT s.username,
       '$2b$10$9RL/bjC8S5hpxlpSDCrhO.f5ALK15DnyexpdEbc.hy2ouUJk0DUtK',
       s.full_name, s.email, s.department_id, 'ACTIVE'
FROM (
              SELECT 'admin'        AS username, 'Quản trị viên hệ thống' AS full_name, 'admin@service-operations.local'   AS email, 6    AS department_id
    UNION ALL SELECT 'giamdoc',       'Lê Minh Quân',          'giamdoc@service-operations.local',      1
    UNION ALL SELECT 'pm.lead',       'Trần Thu Hà',           'pm.lead@service-operations.local',      2
    UNION ALL SELECT 'pm01',          'Nguyễn Văn Dũng',       'pm01@service-operations.local',         2
    UNION ALL SELECT 'sale.lead',     'Phạm Quốc Bảo',         'sale.lead@service-operations.local',    3
    UNION ALL SELECT 'sale01',        'Đỗ Thị Mai',            'sale01@service-operations.local',       3
    UNION ALL SELECT 'ketoan.lead',   'Vũ Thị Lan',            'ketoan.lead@service-operations.local',  4
    UNION ALL SELECT 'ketoan01',      'Hoàng Văn Nam',         'ketoan01@service-operations.local',     4
    UNION ALL SELECT 'nhansu',        'Nguyễn Thị Hương',      'nhansu@service-operations.local',       5
    UNION ALL SELECT 'hr01',          'Bùi Thị Thảo',          'hr01@service-operations.local',         5
    UNION ALL SELECT 'tcn.director',  'Đặng Hoàng Long',       'tcn.director@service-operations.local', 6
    UNION ALL SELECT 'dev.lead',      'Ngô Thanh Tùng',        'dev.lead@service-operations.local',     7
    UNION ALL SELECT 'dev01',         'Lý Văn Cường',          'dev01@service-operations.local',        7
    UNION ALL SELECT 'dev02',         'Trịnh Thị Thu',         'dev02@service-operations.local',        7
    UNION ALL SELECT 'consult.lead',  'Mai Quang Huy',         'consult.lead@service-operations.local', 8
    UNION ALL SELECT 'qa.lead',       'Phan Thị Nga',          'qa.lead@service-operations.local',      9
    UNION ALL SELECT 'khachhang01',   'Nguyễn Thị Nhi',        'nhi@khachhang-abc.example',             NULL
) s
ON DUPLICATE KEY UPDATE
    password_hash         = VALUES(password_hash),
    full_name             = VALUES(full_name),
    email                 = VALUES(email),
    department_id         = VALUES(department_id),
    status                = 'ACTIVE',
    failed_login_attempts = 0,
    locked_until          = NULL;

-- ----------------------------------------------------------------------------
--  2) PHÂN VAI TRÒ + PHẠM VI DỮ LIỆU  (bảng user_role_scopes)
--     scope_type ∈ {COMPANY, DEPARTMENT, SELF}. Chỉ DEPARTMENT mới có scope_department_id.
--     Khóa duy nhất (user_id, role_id) → mỗi tài khoản mỗi vai trò một dòng.
-- ----------------------------------------------------------------------------
INSERT INTO user_role_scopes (user_id, role_id, scope_type, scope_department_id)
SELECT u.id, r.id, s.scope_type, s.scope_department_id
FROM (
              SELECT 'admin'       AS username, 'VT-07' AS role_code, 'COMPANY'    AS scope_type, CAST(NULL AS SIGNED) AS scope_department_id
    UNION ALL SELECT 'giamdoc',      'VT-01', 'COMPANY',    NULL
    UNION ALL SELECT 'pm.lead',      'VT-02', 'DEPARTMENT', 2
    UNION ALL SELECT 'pm01',         'VT-02', 'SELF',       NULL
    UNION ALL SELECT 'sale.lead',    'VT-04', 'DEPARTMENT', 3
    UNION ALL SELECT 'sale01',       'VT-04', 'SELF',       NULL
    UNION ALL SELECT 'ketoan.lead',  'VT-05', 'COMPANY',    NULL
    UNION ALL SELECT 'ketoan01',     'VT-05', 'COMPANY',    NULL
    UNION ALL SELECT 'nhansu',       'VT-06', 'COMPANY',    NULL
    UNION ALL SELECT 'hr01',         'VT-06', 'COMPANY',    NULL
    UNION ALL SELECT 'tcn.director', 'VT-02', 'DEPARTMENT', 6
    UNION ALL SELECT 'dev.lead',     'VT-03', 'SELF',       NULL
    UNION ALL SELECT 'dev01',        'VT-03', 'SELF',       NULL
    UNION ALL SELECT 'dev02',        'VT-03', 'SELF',       NULL
    UNION ALL SELECT 'consult.lead', 'VT-03', 'SELF',       NULL
    UNION ALL SELECT 'qa.lead',      'VT-03', 'SELF',       NULL
    UNION ALL SELECT 'khachhang01',  'VT-09', 'SELF',       NULL
) s
JOIN users u ON u.username = s.username
JOIN roles r ON r.code     = s.role_code
ON DUPLICATE KEY UPDATE
    scope_type          = VALUES(scope_type),
    scope_department_id = VALUES(scope_department_id);

-- ----------------------------------------------------------------------------
--  3) TRƯỞNG ĐƠN VỊ  (departments.manager_id)
--     Mỗi đơn vị có một người quản lý (NCL-01-CN-003). Idempotent: gán lại đúng
--     người mỗi lần chạy.
-- ----------------------------------------------------------------------------
UPDATE departments d
JOIN (
              SELECT 1 AS dept_id, 'giamdoc'      AS manager_username
    UNION ALL SELECT 2, 'pm.lead'
    UNION ALL SELECT 3, 'sale.lead'
    UNION ALL SELECT 4, 'ketoan.lead'
    UNION ALL SELECT 5, 'nhansu'
    UNION ALL SELECT 6, 'tcn.director'
    UNION ALL SELECT 7, 'dev.lead'
    UNION ALL SELECT 8, 'consult.lead'
    UNION ALL SELECT 9, 'qa.lead'
) m ON m.dept_id = d.id
JOIN users u ON u.username = m.manager_username
SET d.manager_id = u.id;

-- ----------------------------------------------------------------------------
--  4) HỒ SƠ NHÂN SỰ  (bảng employees) — cho toàn bộ nhân sự nghiệp vụ nội bộ.
--     KHÔNG tạo cho `admin` (tài khoản hệ thống) và `khachhang01` (bên ngoài).
--     `dev02` làm bán thời gian: 20h/tuần — phục vụ NCL-01-CN-007-TC-02.
--     department_id lấy đúng theo phòng của tài khoản.
-- ----------------------------------------------------------------------------
INSERT INTO employees (user_id, department_id, professional_role, standard_hours_per_week, hire_date)
SELECT u.id, u.department_id, s.professional_role, s.hours, s.hire_date
FROM (
              SELECT 'giamdoc'     AS username, 'Tổng giám đốc'                        AS professional_role, 40.00 AS hours, '2023-01-02' AS hire_date
    UNION ALL SELECT 'pm.lead',      'Trưởng phòng Quản lý dự án',            40.00, '2023-02-01'
    UNION ALL SELECT 'tcn.director',  'Giám đốc Trung tâm Công nghệ & Giải pháp', 40.00, '2023-02-15'
    UNION ALL SELECT 'ketoan.lead',   'Kế toán trưởng',                       40.00, '2023-03-01'
    UNION ALL SELECT 'sale.lead',     'Trưởng phòng Kinh doanh',              40.00, '2023-03-15'
    UNION ALL SELECT 'nhansu',        'Trưởng phòng Nhân sự',                 40.00, '2023-04-03'
    UNION ALL SELECT 'dev.lead',      'Trưởng nhóm Phát triển phần mềm',      40.00, '2023-06-01'
    UNION ALL SELECT 'consult.lead',  'Trưởng nhóm Tư vấn giải pháp',         40.00, '2023-06-15'
    UNION ALL SELECT 'qa.lead',       'Trưởng nhóm Kiểm thử & QA',            40.00, '2023-07-03'
    UNION ALL SELECT 'ketoan01',      'Kế toán viên',                        40.00, '2024-01-08'
    UNION ALL SELECT 'hr01',          'Chuyên viên nhân sự',                 40.00, '2024-02-05'
    UNION ALL SELECT 'pm01',          'Quản lý dự án',                       40.00, '2024-03-04'
    UNION ALL SELECT 'sale01',        'Nhân viên kinh doanh',                40.00, '2024-09-02'
    UNION ALL SELECT 'dev01',         'Kỹ sư phần mềm',                       40.00, '2024-10-01'
    UNION ALL SELECT 'dev02',         'Kỹ sư phần mềm (bán thời gian)',       20.00, '2025-02-03'
) s
JOIN users u ON u.username = s.username
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id);

-- ----------------------------------------------------------------------------
--  5) HỢP ĐỒNG LAO ĐỘNG  (bảng employment_contracts) — một hợp đồng còn hiệu lực
--     cho mỗi hồ sơ nhân sự. contract_type ∈ {FULL_TIME, PART_TIME}.
--     start_date = ngày vào làm; end_date để trống (đang làm việc).
-- ----------------------------------------------------------------------------
INSERT INTO employment_contracts (employee_id, contract_type, start_date)
SELECT e.id,
       CASE WHEN u.username = 'dev02' THEN 'PART_TIME' ELSE 'FULL_TIME' END,
       e.hire_date
FROM employees e
JOIN users u ON u.id = e.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM employment_contracts c WHERE c.employee_id = e.id
);
