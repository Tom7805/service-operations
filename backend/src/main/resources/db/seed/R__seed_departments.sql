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
--  Cây tổ chức mô phỏng — MỘT cây thống nhất, đúng 4 tầng phân cấp:
--  Trung tâm > Ban > Phòng > Tổ/Nhóm (mỗi tầng CHỈ trực thuộc đúng tầng liền
--  trên, không còn hai loại ngang hàng như bản trước).
--
--  id 1..9 giữ NGUYÊN (frontend `SYSTEM_DEPARTMENTS` tham chiếu id cứng, và
--  seed thứ 3 — R__seed_roles_permissions.sql — gán department_id theo đúng
--  các id này cho từng tài khoản mẫu). Đã THÊM id 10 làm gốc mới, và đổi
--  LOẠI của id 6 (trước ghi "Trung Tâm..." nhưng lại nằm dưới một "Ban" —
--  hiển thị sai thứ bậc trên cây; nay đổi tên + loại cho khớp đúng tầng nó
--  đang đứng: PHÒNG, không phải TRUNG_TÂM).
--
--  Ràng buộc cấp bậc (`DepartmentHierarchyValidator`, V23): đơn vị con không
--  được có cấp CAO hơn đơn vị cha. Hạng: TRUNG_TAM=0 < BAN=1 < PHONG=2 < TO=3.
--
--  id 11..18: THÊM 2 Tổ/Nhóm dưới mỗi Phòng còn lại (trước đây chỉ Phòng Công
--  Nghệ có con — cây lệch hẳn về một nhánh). Không gán trưởng bộ phận (tổ mới
--  lập, hợp lý khi chưa có trưởng nhóm) — tránh phải bịa thêm hàng loạt tài
--  khoản/nhân sự giả không phục vụ mục đích kiểm thử nào.
--
--     [10] Trung Tâm Vận Hành .......................... TRUNG_TAM  (gốc)
--          └── [1] Ban Giám Đốc ........................ BAN
--              ├── [2] Phòng Quản Lý Dự Án (PMO) ....... PHONG
--              │   ├── [11] Tổ Điều Phối Dự Án .......... TO
--              │   └── [12] Tổ Giám Sát Tiến Độ .......... TO
--              ├── [3] Phòng KD & Phát Triển Thị Trường  PHONG
--              │   ├── [13] Tổ Kinh Doanh Trong Nước ..... TO
--              │   └── [14] Tổ Phát Triển Thị Trường Mới . TO
--              ├── [4] Phòng Kế Toán - Tài Chính ........ PHONG
--              │   ├── [15] Tổ Kế Toán Tổng Hợp .......... TO
--              │   └── [16] Tổ Công Nợ & Thu Chi ......... TO
--              ├── [5] Phòng Nhân Sự .................... PHONG
--              │   ├── [17] Tổ Tuyển Dụng & Đào Tạo ...... TO
--              │   └── [18] Tổ Chính Sách & Phúc Lợi ..... TO
--              └── [6] Phòng Công Nghệ & Giải Pháp ...... PHONG
--                  ├── [7] Nhóm Phát Triển Phần Mềm ..... TO
--                  ├── [8] Nhóm Tư Vấn Giải Pháp ......... TO
--                  └── [9] Nhóm Kiểm Thử & Đảm Bảo CL .... TO
--
--  Cột manager_id được gán ở file thứ 3 (sau khi đã có users). ON DUPLICATE
--  KEY UPDATE chỉ đụng name/parent_id/unit_type nên manager_id không bị xóa.
-- ----------------------------------------------------------------------------
INSERT INTO departments (id, name, parent_id, unit_type) VALUES
    (10, 'Trung Tâm Vận Hành',                        NULL, 'TRUNG_TAM'),
    (1,  'Ban Giám Đốc',                              10,   'BAN'),
    (2,  'Phòng Quản Lý Dự Án (PMO)',                 1,    'PHONG'),
    (3,  'Phòng Kinh Doanh & Phát Triển Thị Trường',  1,    'PHONG'),
    (4,  'Phòng Kế Toán - Tài Chính',                 1,    'PHONG'),
    (5,  'Phòng Nhân Sự',                             1,    'PHONG'),
    (6,  'Phòng Công Nghệ & Giải Pháp',               1,    'PHONG'),
    (7,  'Nhóm Phát Triển Phần Mềm',                  6,    'TO'),
    (8,  'Nhóm Tư Vấn Giải Pháp',                     6,    'TO'),
    (9,  'Nhóm Kiểm Thử & Đảm Bảo Chất Lượng',        6,    'TO'),
    (11, 'Tổ Điều Phối Dự Án',                        2,    'TO'),
    (12, 'Tổ Giám Sát Tiến Độ',                       2,    'TO'),
    (13, 'Tổ Kinh Doanh Trong Nước',                  3,    'TO'),
    (14, 'Tổ Phát Triển Thị Trường Mới',              3,    'TO'),
    (15, 'Tổ Kế Toán Tổng Hợp',                       4,    'TO'),
    (16, 'Tổ Công Nợ & Thu Chi',                      4,    'TO'),
    (17, 'Tổ Tuyển Dụng & Đào Tạo',                   5,    'TO'),
    (18, 'Tổ Chính Sách & Phúc Lợi',                  5,    'TO')
ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id), unit_type = VALUES(unit_type);
