-- =============================================================================
--  DỮ LIỆU NỀN — BẢNG ĐƠN GIÁ BÁN THEO VAI TRÒ (NCL-07-CN-001 / NCL-07-CN-002)
-- =============================================================================
--  Bảng `bill_rates` được tạo bởi V38__create_quote_and_bill_rate_tables.sql
--  nhưng KHÔNG có dữ liệu mẫu đi kèm. Thiếu file này thì mọi dòng báo giá ở
--  NCL-03-CN-003 (Lập báo giá cho cơ hội) đều rơi vào nhánh "chưa có đơn giá
--  hiệu lực" (missingRates) và tổng tiền luôn bằng 0 — không phải lỗi code,
--  chỉ là thiếu dữ liệu nền.
--
--  Khớp CHÍNH XÁC (không phân biệt hoa/thường) với hai nơi dùng tên chức danh
--  ở frontend, vì QuoteServiceImpl tra cứu theo so khớp chuỗi đầy đủ:
--   1. Hai dòng mặc định của QuoteBuilder.tsx  (tên KHÔNG có hậu tố tiếng Anh)
--   2. Danh sách gợi ý POPULAR_PROFESSIONAL_ROLES trong opportunityTypes.ts
--      (tên CÓ kèm hậu tố tiếng Anh, ví dụ "... (Senior Developer)")
--  Hai tập tên này không trùng nhau trong code hiện tại, nên seed đủ cả hai
--  để người kiểm thử gõ tay hay chọn từ ô gợi ý đều ra kết quả tính tiền.
--
--  Mỗi vai trò seed 2 mốc hiệu lực (2023-01-01 và 2024-01-01) để minh chứng
--  QTN-15 "đơn giá áp theo thời điểm phát sinh": một dòng giờ công phát sinh
--  trước 2024-01-01 vẫn phải lấy đơn giá cũ, không bị tính nhầm sang giá mới.
--
--  Idempotent qua ON DUPLICATE KEY UPDATE theo khóa duy nhất
--  (professional_role, level, effective_from) — cột `level` (cấp bậc) được bổ
--  sung ở V64__add_level_to_bill_rates.sql theo AC của NCL-07-CN-001 (mỗi dòng
--  đơn giá gồm vai trò + cấp bậc + đơn giá). Giá trị cấp bậc dưới đây chỉ mang
--  tính minh hoạ, suy ra từ tên vai trò sẵn có — nghiệp vụ có thể điều chỉnh.
-- ----------------------------------------------------------------------------
INSERT INTO bill_rates (professional_role, level, daily_rate, effective_from)
VALUES
    -- Tên KHÔNG hậu tố tiếng Anh (khớp 2 dòng mặc định của QuoteBuilder.tsx)
    ('Lập trình viên cao cấp',              'Cao cấp',  2200000, '2023-01-01'),
    ('Lập trình viên cao cấp',              'Cao cấp',  2500000, '2024-01-01'),
    ('Kỹ sư kiểm thử phần mềm',             'Trung cấp',1400000, '2023-01-01'),
    ('Kỹ sư kiểm thử phần mềm',             'Trung cấp',1600000, '2024-01-01'),

    -- Tên CÓ hậu tố tiếng Anh (khớp datalist POPULAR_PROFESSIONAL_ROLES)
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
    ('Chuyên viên phân tích nghiệp vụ (Business Analyst)', 'Trung cấp',2100000, '2024-01-01')
ON DUPLICATE KEY UPDATE
    daily_rate = VALUES(daily_rate);
