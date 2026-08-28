-- =============================================================================
--  DỮ LIỆU NỀN (1/3) — DANH MỤC: VAI TRÒ + CÂY TỔ CHỨC
-- =============================================================================
--  Flyway chạy các migration repeatable (R__) SAU tất cả migration đánh số, và
--  theo THỨ TỰ TÊN FILE. Chuỗi seed gồm 3 file, chạy theo đúng thứ tự phụ thuộc:
--
--     R__seed_departments.sql      (file này) — roles, departments   [không phụ thuộc]
--     R__seed_reference_data.sql   — two_factor_settings             [cần roles]
--     R__seed_roles_permissions.sql— users, phân vai trò + phạm vi,  [cần roles + departments]
--                                    trưởng đơn vị, hồ sơ nhân sự
--
--  Tất cả câu lệnh đều idempotent (chạy lại nhiều lần không hỏng, không nhân bản).
--  Bảng `permissions` / `role_permissions` KHÔNG được seed: hệ thống phân quyền
--  thực thi bằng MÃ VAI TRÒ (@PreAuthorize("hasRole('VT-xx')"), QTN-01); hai bảng
--  đó là chỗ dành sẵn cho story phân quyền chi tiết về sau.
-- =============================================================================

-- ----------------------------------------------------------------------------
--  9 vai trò hệ thống (backlog Mục 2). Tên khớp `SYSTEM_ROLES` ở frontend.
--  Seed sở hữu name/description; chạy lại sẽ đồng bộ lại đúng hai cột này.
-- ----------------------------------------------------------------------------
INSERT INTO roles (code, name, description) VALUES
    ('VT-01', 'Ban giám đốc',
     'Người điều hành công ty, theo dõi sức khỏe tài chính và năng lực toàn công ty. Không trực tiếp ghi giờ công hay sửa dữ liệu vận hành.'),
    ('VT-02', 'Quản lý dự án (PM)',
     'Chịu trách nhiệm một hoặc nhiều dự án từ lúc khởi động tới lúc đóng: chia việc, giao việc, duyệt bảng chấm công, đề nghị xuất hóa đơn.'),
    ('VT-03', 'Nhân viên chuyên môn',
     'Người trực tiếp thực hiện công việc của dự án và ghi nhận giờ công của chính mình.'),
    ('VT-04', 'Nhân viên kinh doanh',
     'Tìm khách hàng, theo đuổi cơ hội, lập báo giá và đưa hợp đồng về công ty.'),
    ('VT-05', 'Kế toán',
     'Lập hóa đơn, ghi nhận thanh toán, duyệt chi phí dự án và đối chiếu doanh thu với chi phí.'),
    ('VT-06', 'Nhân sự (HR)',
     'Quản lý hồ sơ nhân sự, hợp đồng lao động, ngày lễ và chi phí giờ công nội bộ.'),
    ('VT-07', 'Quản trị viên',
     'Quản trị hệ thống: tài khoản, cây tổ chức, phân quyền, cấu hình và nhật ký truy cập.'),
    ('VT-08', 'Nhân viên công ty',
     'Cách gọi chung khi mô tả chức năng dùng chung (ví dụ đăng nhập). KHÔNG phải vai trò cấp quyền riêng, không gán cho tài khoản thật.'),
    ('VT-09', 'Khách hàng',
     'Đại diện phía khách hàng được cấp tài khoản cổng để theo dõi tiến độ, nghiệm thu và công nợ của chính mình. Nằm ngoài cây tổ chức nội bộ.')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- ----------------------------------------------------------------------------
--  Cây tổ chức mô phỏng — MỘT cây thống nhất quy về Ban Giám Đốc.
--
--  id 1..6 giữ NGUYÊN (frontend `SYSTEM_DEPARTMENTS` tham chiếu id cứng);
--  id 6 (Trung tâm Công nghệ) từ nay trực thuộc Ban Giám Đốc thay vì đứng gốc
--  riêng — để "phạm vi Toàn công ty" đúng bằng toàn bộ nhánh dưới Ban Giám Đốc.
--  Thêm 3 TỔ/NHÓM (id 7..9) dưới Trung tâm Công nghệ: đây là nơi bố trí lực
--  lượng "Nhân viên chuyên môn" (VT-03) và để kiểm thử phạm vi "một nhánh +
--  toàn bộ đơn vị con cháu" (NCL-01-CN-004-TC-01).
--
--  Ràng buộc cấp bậc (V23): đơn vị con không được có cấp CAO hơn đơn vị cha.
--  Hạng: TRUNG_TAM = BAN = 0  <  PHONG = 1  <  TO = 2.
--
--     [1] Ban Giám Đốc ................................... BAN        (gốc)
--         ├── [2] Phòng Quản Lý Dự Án (PMO) ............. PHONG
--         ├── [3] Phòng Kinh Doanh & Phát Triển Thị Trường PHONG
--         ├── [4] Phòng Kế Toán - Tài Chính ............. PHONG
--         ├── [5] Phòng Nhân Sự ......................... PHONG
--         └── [6] Trung Tâm Công Nghệ & Giải Pháp ....... TRUNG_TAM
--             ├── [7] Nhóm Phát Triển Phần Mềm .......... TO
--             ├── [8] Nhóm Tư Vấn Giải Pháp ............. TO
--             └── [9] Nhóm Kiểm Thử & Đảm Bảo Chất Lượng  TO
--
--  Cột manager_id được gán ở file thứ 3 (sau khi đã có users). ON DUPLICATE
--  KEY UPDATE chỉ đụng name/parent_id/unit_type nên manager_id không bị xóa.
-- ----------------------------------------------------------------------------
INSERT INTO departments (id, name, parent_id, unit_type) VALUES
    (1, 'Ban Giám Đốc',                              NULL, 'BAN'),
    (2, 'Phòng Quản Lý Dự Án (PMO)',                 1,    'PHONG'),
    (3, 'Phòng Kinh Doanh & Phát Triển Thị Trường',  1,    'PHONG'),
    (4, 'Phòng Kế Toán - Tài Chính',                 1,    'PHONG'),
    (5, 'Phòng Nhân Sự',                             1,    'PHONG'),
    (6, 'Trung Tâm Công Nghệ & Giải Pháp',           1,    'TRUNG_TAM'),
    (7, 'Nhóm Phát Triển Phần Mềm',                  6,    'TO'),
    (8, 'Nhóm Tư Vấn Giải Pháp',                     6,    'TO'),
    (9, 'Nhóm Kiểm Thử & Đảm Bảo Chất Lượng',        6,    'TO')
ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id), unit_type = VALUES(unit_type);
