-- =============================================================================
--  DỮ LIỆU NỀN BỔ SUNG — TRẢI ĐỀU CƠ HỘI CHO MÀN "DỰ BÁO DOANH THU" (NCL-03-CN-004)
-- =============================================================================
--  Trước khi có file này, các cơ hội OPEN sẵn có (2001–2016) chỉ trải trên
--  4 tháng (05, 06, 09, 10, 11, 12/2026) và một số tháng chỉ có đúng 1 cơ hội
--  giá trị thấp — biểu đồ "Phân bổ doanh thu kỳ vọng theo tháng" nhìn lệch,
--  vài cột gần như phẳng. File này KHÔNG sửa cơ hội cũ, chỉ thêm 8 cơ hội mới
--  (id 2101–2108) vào các tháng đã có (tăng thêm dữ liệu) và nối dài sang
--  tháng 01–02/2027, mỗi cơ hội một khách hàng và tên khác nhau (đúng ràng
--  buộc chống trùng tên trong cùng khách hàng mới thêm ở OpportunityServiceImpl).
--
--  Mọi cơ hội đều OPEN và có probability hợp lệ (đúng mốc theo giai đoạn:
--  APPROACH=10, PROPOSAL=40, NEGOTIATION=70 — xem OpportunityStageServiceImpl)
--  để không tái diễn lỗi "probability NULL bị tính ngầm thành 0".
--
--  Chạy sau R__seed_sample_customers.sql và R__seed_sample_opportunities.sql
--  (thứ tự theo tên file — file này đổi tên thành "seed_sample_revenue_..."
--  để xếp SAU "seed_sample_customers"/"seed_sample_opportunities" theo alphabet,
--  vì tên cũ "seed_revenue_forecast..." xếp TRƯỚC "seed_sample_customers" nên
--  chạy trước khi khách hàng ton tai, gay loi FK khi khoi dong ung dung).
--
--  owner_id (2026-09-22): truoc day khong duoc gan (luon NULL) — sau khi
--  OpportunityServiceImpl.list() ap dung pham vi du lieu QTN-01 (xem
--  R__seed_sample_opportunities.sql), 8 co hoi nay se an voi tai khoan pham
--  vi SELF/DEPARTMENT (sale01, sale.lead) neu khong co owner_id. Gan bang
--  dung nguoi trong created_by, giong cach OpportunityServiceImpl.create()
--  mac dinh khi khong chi dinh nguoi phu trach khac.
--
--  Idempotent qua ON DUPLICATE KEY UPDATE theo id co dinh.
-- ----------------------------------------------------------------------------
INSERT INTO opportunities (id, name, customer_id, expected_value, expected_close_date, stage, status, probability, created_by, created_at, owner_id)
SELECT o.id, o.name, o.customer_id, o.expected_value, o.expected_close_date, o.stage, o.status, o.probability, o.created_by, o.created_at, u.id
FROM (
              SELECT 2101 AS id, 'Tư vấn chuyển đổi số cho Công ty CP VietTinBank'     AS name, 1004 AS customer_id, 280000000 AS expected_value, '2026-09-10' AS expected_close_date, 'PROPOSAL'    AS stage, 'OPEN' AS status, 40 AS probability, 'sale01'    AS created_by, '2026-08-01 09:00:00' AS created_at
    UNION ALL SELECT 2102, 'Triển khai hệ thống quản lý kho cho BPex',              1002, 200000000, '2026-10-12', 'APPROACH',    'OPEN', 10, 'sale.lead', '2026-08-10 09:00:00'
    UNION ALL SELECT 2103, 'Mở rộng hạ tầng mạng cho Công ty TNHH SX',              1003, 320000000, '2026-11-05', 'NEGOTIATION', 'OPEN', 70, 'sale01',    '2026-07-15 09:00:00'
    UNION ALL SELECT 2104, 'Nâng cấp hệ thống ERP cho Công ty TNHH 1 thành viên',   1004, 260000000, '2026-12-01', 'PROPOSAL',    'OPEN', 40, 'sale.lead', '2026-08-15 09:00:00'
    UNION ALL SELECT 2105, 'Triển khai giải pháp bảo mật cho Beta',                 1006, 180000000, '2027-01-15', 'APPROACH',    'OPEN', 10, 'sale01',    '2026-08-20 09:00:00'
    UNION ALL SELECT 2106, 'Tư vấn quy trình vận hành giai đoạn 2 cho An Phát',     1003, 300000000, '2027-01-25', 'NEGOTIATION', 'OPEN', 70, 'sale.lead', '2026-06-01 09:00:00'
    UNION ALL SELECT 2107, 'Xây dựng cổng thông tin khách hàng cho ACBank',         1005, 350000000, '2027-02-10', 'PROPOSAL',    'OPEN', 40, 'sale01',    '2026-08-25 09:00:00'
    UNION ALL SELECT 2108, 'Triển khai module báo cáo cho Tập Đoàn Sao Việt',       1004, 150000000, '2027-02-20', 'APPROACH',    'OPEN', 10, 'sale.lead', '2026-08-28 09:00:00'
) o
JOIN users u ON u.username = o.created_by
ON DUPLICATE KEY UPDATE
    name                = VALUES(name),
    customer_id         = VALUES(customer_id),
    expected_value      = VALUES(expected_value),
    expected_close_date = VALUES(expected_close_date),
    stage               = VALUES(stage),
    status              = VALUES(status),
    probability         = VALUES(probability),
    created_by          = VALUES(created_by),
    owner_id            = VALUES(owner_id);
