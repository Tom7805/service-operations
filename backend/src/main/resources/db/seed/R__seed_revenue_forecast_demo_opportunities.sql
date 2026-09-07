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
--  (thứ tự theo tên file — "revenue_forecast" xếp sau "sample_opportunities"
--  theo alphabet nên khong xung dot id).
--
--  Idempotent qua ON DUPLICATE KEY UPDATE theo id co dinh.
-- ----------------------------------------------------------------------------
INSERT INTO opportunities (id, name, customer_id, expected_value, expected_close_date, stage, status, probability, created_by, created_at)
VALUES
    (2101, 'Tư vấn chuyển đổi số cho Công ty CP VietTinBank',       4,    280000000, '2026-09-10', 'PROPOSAL',    'OPEN', 40, 'sale01',    '2026-08-01 09:00:00'),
    (2102, 'Triển khai hệ thống quản lý kho cho BPex',              1011, 200000000, '2026-10-12', 'APPROACH',    'OPEN', 10, 'sale.lead', '2026-08-10 09:00:00'),
    (2103, 'Mở rộng hạ tầng mạng cho Công ty TNHH SX',              1008, 320000000, '2026-11-05', 'NEGOTIATION', 'OPEN', 70, 'sale01',    '2026-07-15 09:00:00'),
    (2104, 'Nâng cấp hệ thống ERP cho Công ty TNHH 1 thành viên',   1009, 260000000, '2026-12-01', 'PROPOSAL',    'OPEN', 40, 'sale.lead', '2026-08-15 09:00:00'),
    (2105, 'Triển khai giải pháp bảo mật cho Beta',                 3,    180000000, '2027-01-15', 'APPROACH',    'OPEN', 10, 'sale01',    '2026-08-20 09:00:00'),
    (2106, 'Tư vấn quy trình vận hành giai đoạn 2 cho An Phát',     1003, 300000000, '2027-01-25', 'NEGOTIATION', 'OPEN', 70, 'sale.lead', '2026-06-01 09:00:00'),
    (2107, 'Xây dựng cổng thông tin khách hàng cho ACBank',         1007, 350000000, '2027-02-10', 'PROPOSAL',    'OPEN', 40, 'sale01',    '2026-08-25 09:00:00'),
    (2108, 'Triển khai module báo cáo cho Tập Đoàn Sao Việt',       1004, 150000000, '2027-02-20', 'APPROACH',    'OPEN', 10, 'sale.lead', '2026-08-28 09:00:00')
ON DUPLICATE KEY UPDATE
    name                = VALUES(name),
    customer_id         = VALUES(customer_id),
    expected_value      = VALUES(expected_value),
    expected_close_date = VALUES(expected_close_date),
    stage               = VALUES(stage),
    status              = VALUES(status),
    probability         = VALUES(probability),
    created_by          = VALUES(created_by);
