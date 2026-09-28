-- =============================================================================
--  DỮ LIỆU NỀN — BẢNG ĐƠN GIÁ BÁN THEO VAI TRÒ (NCL-07-CN-001 / NCL-07-CN-002)
-- =============================================================================
--  Bảng `bill_rates` được tạo bởi V38__create_quote_and_bill_rate_tables.sql
--  nhưng KHÔNG có dữ liệu mẫu đi kèm. Thiếu file này thì mọi dòng báo giá ở
--  NCL-03-CN-003 (Lập báo giá cho cơ hội) đều rơi vào nhánh "chưa có đơn giá
--  hiệu lực" (missingRates) và tổng tiền luôn bằng 0 — không phải lỗi code,
--  chỉ là thiếu dữ liệu nền.
--
--  File này seed BA nhóm đơn giá, không nhóm nào được xoá khi viết lại vì mỗi
--  nhóm phục vụ một nơi khác nhau trong code — xoá nhầm nhóm nào thì nơi đó
--  hỏng theo:
--
--   NHÓM 1 — Mặc định cứng của QuoteBuilder.tsx (dòng 51-52): mỗi lần tạo báo
--            giá mới, form tự điền sẵn 2 dòng "Lập trình viên cao cấp" +
--            "Kỹ sư kiểm thử phần mềm" (KHÔNG hậu tố tiếng Anh). Đây là chuỗi
--            hardcode trong code, không đọc từ danh sách nào — xoá 2 dòng đơn
--            giá này thì 2 dòng mặc định của form MẤT giá ngay khi mở.
--
--   NHÓM 2 — Danh sách gợi ý POPULAR_PROFESSIONAL_ROLES (opportunityTypes.ts,
--            8 vai trò CÓ hậu tố tiếng Anh, ví dụ "... (Senior Developer)").
--            QuoteBuilder.tsx dòng 284 gộp danh sách này với các vai trò THẬT
--            đang có trong bảng `bill_rates` để làm datalist gợi ý khi gõ tay
--            — không bắt buộc phải tồn tại, nhưng để trống thì gợi ý ra tên
--            mà bấm vào vẫn "chưa có đơn giá", trải nghiệm demo xấu.
--
--   NHÓM 3 (bổ sung) — Khớp ĐÚNG 1-1 với `professional_role` + `level` THẬT
--            của 15 nhân sự seed trong R__seed_roles_permissions.sql mục (4).
--            Trước bản sửa này, NHÓM 1 và NHÓM 2 không có dòng nào trùng tên
--            với bất kỳ nhân sự thật nào (VD dev01 = "Kỹ sư phần mềm" nhưng
--            bill_rates chỉ có "Lập trình viên cao cấp (Senior Developer)")
--            nên NCL-07-CN-005 (Tra đơn giá cho một dòng giờ công) luôn báo
--            "chưa có đơn giá hiệu lực" cho MỌI nhân sự demo — không phải lỗi
--            tính năng, chỉ vì hai bảng seed được viết độc lập, chưa từng đối
--            chiếu chuỗi. Mức đơn giá theo cấp bậc lấy lại đúng dải giá đã
--            dùng ở nhóm 1/2 (Quản lý ≈ dải PM, Cao cấp ≈ dải Senior/Solution
--            Architect, Trung cấp ≈ dải Developer) để nhất quán trong toàn bộ
--            demo, không bịa dải giá mới.
--
--  Mỗi vai trò seed 2 mốc hiệu lực (2023-01-01 và 2024-01-01) để minh chứng
--  QTN-15 "đơn giá áp theo thời điểm phát sinh": một dòng giờ công phát sinh
--  trước 2024-01-01 vẫn phải lấy đơn giá cũ, không bị tính nhầm sang giá mới.
--
--  Idempotent qua ON DUPLICATE KEY UPDATE theo khóa duy nhất
--  (professional_role, level, effective_from) — cột `level` (cấp bậc) được bổ
--  sung ở V64__add_level_to_bill_rates.sql theo AC của NCL-07-CN-001 (mỗi dòng
--  đơn giá gồm vai trò + cấp bậc + đơn giá).
-- ----------------------------------------------------------------------------
INSERT INTO bill_rates (professional_role, level, daily_rate, effective_from)
VALUES
    -- NHÓM 1 — mặc định cứng của QuoteBuilder.tsx (không hậu tố tiếng Anh)
    ('Lập trình viên cao cấp',              'Cao cấp',  2200000, '2023-01-01'),
    ('Lập trình viên cao cấp',              'Cao cấp',  2500000, '2024-01-01'),
    ('Kỹ sư kiểm thử phần mềm',             'Trung cấp',1400000, '2023-01-01'),
    ('Kỹ sư kiểm thử phần mềm',             'Trung cấp',1600000, '2024-01-01'),

    -- NHÓM 2 — khớp datalist POPULAR_PROFESSIONAL_ROLES (có hậu tố tiếng Anh)
    ('Quản lý dự án (Project Manager)',                    'Quản lý',  2800000, '2023-01-01'),
    ('Quản lý dự án (Project Manager)',                    'Quản lý',  3200000, '2024-01-01'),
    ('Kiến trúc sư giải pháp (Solution Architect)',        'Cao cấp',  3000000, '2023-01-01'),
    ('Kiến trúc sư giải pháp (Solution Architect)',        'Cao cấp',  3500000, '2024-01-01'),
    ('Lập trình viên cao cấp (Senior Developer)',          'Cao cấp',  2200000, '2023-01-01'),
    ('Lập trình viên cao cấp (Senior Developer)',          'Cao cấp',  2500000, '2024-01-01'),
    ('Lập trình viên (Developer)',                         'Trung cấp',1600000, '2023-01-01'),
    ('Lập trình viên (Developer)',                         'Trung cấp',1800000, '2024-01-01'),
    ('Kỹ sư kiểm thử phần mềm (QA/QC Engineer)',           'Trung cấp',1400000, '2023-01-01'),
    ('Kỹ sư kiểm thử phần mềm (QA/QC Engineer)',           'Trung cấp',1600000, '2024-01-01'),
    ('Thiết kế giao diện & trải nghiệm (UI/UX Designer)',  'Trung cấp',1800000, '2023-01-01'),
    ('Thiết kế giao diện & trải nghiệm (UI/UX Designer)',  'Trung cấp',2000000, '2024-01-01'),
    ('Kỹ sư hệ thống / DevOps (DevOps Engineer)',          'Trung cấp',2000000, '2023-01-01'),
    ('Kỹ sư hệ thống / DevOps (DevOps Engineer)',          'Trung cấp',2300000, '2024-01-01'),
    ('Chuyên viên phân tích nghiệp vụ (Business Analyst)', 'Trung cấp',1900000, '2023-01-01'),
    ('Chuyên viên phân tích nghiệp vụ (Business Analyst)', 'Trung cấp',2100000, '2024-01-01'),

    -- NHÓM 3 — khớp ĐÚNG chuỗi professional_role + level thật của 15 nhân sự
    -- seed (R__seed_roles_permissions.sql mục 4). Dải giá theo cấp bậc:
    --   Quản lý  ≈ dải "Quản lý dự án (Project Manager)" ở NHÓM 2
    --   Cao cấp  ≈ dải "Lập trình viên cao cấp" ở NHÓM 1/2
    --   Trung cấp ≈ dải "Lập trình viên (Developer)" ở NHÓM 2
    ('Tổng giám đốc',                            'Quản lý',  2800000, '2023-01-01'),
    ('Tổng giám đốc',                            'Quản lý',  3200000, '2024-01-01'),
    ('Trưởng phòng Quản lý dự án',                'Quản lý',  2800000, '2023-01-01'),
    ('Trưởng phòng Quản lý dự án',                'Quản lý',  3200000, '2024-01-01'),
    ('Giám đốc Trung tâm Công nghệ & Giải pháp',  'Quản lý',  2800000, '2023-01-01'),
    ('Giám đốc Trung tâm Công nghệ & Giải pháp',  'Quản lý',  3200000, '2024-01-01'),
    ('Kế toán trưởng',                            'Quản lý',  2800000, '2023-01-01'),
    ('Kế toán trưởng',                            'Quản lý',  3200000, '2024-01-01'),
    ('Trưởng phòng Kinh doanh',                   'Quản lý',  2800000, '2023-01-01'),
    ('Trưởng phòng Kinh doanh',                   'Quản lý',  3200000, '2024-01-01'),
    ('Trưởng phòng Nhân sự',                      'Quản lý',  2800000, '2023-01-01'),
    ('Trưởng phòng Nhân sự',                      'Quản lý',  3200000, '2024-01-01'),
    ('Quản lý dự án',                             'Quản lý',  2800000, '2023-01-01'),
    ('Quản lý dự án',                             'Quản lý',  3200000, '2024-01-01'),
    ('Trưởng nhóm Phát triển phần mềm',           'Cao cấp',  2200000, '2023-01-01'),
    ('Trưởng nhóm Phát triển phần mềm',           'Cao cấp',  2500000, '2024-01-01'),
    ('Trưởng nhóm Tư vấn giải pháp',               'Cao cấp',  2200000, '2023-01-01'),
    ('Trưởng nhóm Tư vấn giải pháp',               'Cao cấp',  2500000, '2024-01-01'),
    ('Trưởng nhóm Kiểm thử & QA',                 'Cao cấp',  2200000, '2023-01-01'),
    ('Trưởng nhóm Kiểm thử & QA',                 'Cao cấp',  2500000, '2024-01-01'),
    ('Kế toán viên',                              'Trung cấp',1600000, '2023-01-01'),
    ('Kế toán viên',                              'Trung cấp',1800000, '2024-01-01'),
    ('Chuyên viên nhân sự',                       'Trung cấp',1600000, '2023-01-01'),
    ('Chuyên viên nhân sự',                       'Trung cấp',1800000, '2024-01-01'),
    ('Nhân viên kinh doanh',                      'Trung cấp',1600000, '2023-01-01'),
    ('Nhân viên kinh doanh',                      'Trung cấp',1800000, '2024-01-01'),
    ('Kỹ sư phần mềm',                            'Trung cấp',1600000, '2023-01-01'),
    ('Kỹ sư phần mềm',                            'Trung cấp',1800000, '2024-01-01'),
    ('Kỹ sư phần mềm (bán thời gian)',            'Trung cấp',1600000, '2023-01-01'),
    ('Kỹ sư phần mềm (bán thời gian)',            'Trung cấp',1800000, '2024-01-01')
ON DUPLICATE KEY UPDATE
    daily_rate = VALUES(daily_rate);
