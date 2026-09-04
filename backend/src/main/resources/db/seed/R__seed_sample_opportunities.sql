-- =============================================================================
--  DU LIEU NEN — CO HOI BAN HANG MAU (NCL-03-CN-006)
-- =============================================================================
--  Chay SAU R__seed_sample_customers.sql (Flyway chay migration repeatable
--  theo thu tu TEN FILE): opportunities.customer_id la khoa ngoai toi
--  customers.id nen can bang customers co san truoc. Bang `opportunities`
--  duoc tao boi V35 (NCL-03-CN-001) — file nay chi seed du lieu, khong tao
--  bang.
--
--  Muc dich: co san vai co hoi + vai hoat dong cham soc de xem ngay dong thoi
--  gian tren giao dien / thu API (GET, POST .../activities) ma khong phai tu
--  goi POST /opportunities truoc.
--
--  Co hoi 2001 gan voi khach hang 1001 (chu so huu sale01); co hoi 2002 gan
--  voi khach hang 1003 (chu so huu sale.lead) — dung tai khoan tuong ung de
--  dang nhap va thu chuc nang ghi nhan hoat dong cham soc. Ca hai deu o giai
--  doan APPROACH / trang thai OPEN nen van them duoc hoat dong moi.
--
--  Idempotent qua ON DUPLICATE KEY UPDATE theo id co dinh.
-- ----------------------------------------------------------------------------
INSERT INTO opportunities (id, name, customer_id, expected_value, expected_close_date, stage, status, created_by, created_at)
VALUES
    (2001, 'Trien khai he thong CRM cho Cong ty CP Giai Phap So Viet', 1001, 500000000, '2026-06-30', 'APPROACH', 'OPEN', 'sale01', '2026-01-05 09:00:00'),
    (2002, 'Tu van quy trinh xay dung so cho An Phat', 1003, 300000000, '2026-05-31', 'APPROACH', 'OPEN', 'sale.lead', '2026-01-10 10:30:00')
ON DUPLICATE KEY UPDATE
    name                = VALUES(name),
    expected_value      = VALUES(expected_value),
    expected_close_date = VALUES(expected_close_date),
    stage               = VALUES(stage),
    status              = VALUES(status),
    created_by          = VALUES(created_by);

INSERT INTO opportunity_activities (id, opportunity_id, activity_type, occurred_at, participants, content, created_by, created_at)
VALUES
    (3001, 2001, 'CALL', '2026-01-06 14:00:00', 'sale01, chi Lan (khach hang)',
     'Goi gioi thieu giai phap CRM, khach hang quan tam module bao gia tu dong.', 'sale01', '2026-01-06 14:05:00'),
    (3002, 2001, 'MEETING', '2026-01-12 09:30:00', 'sale01, anh Minh (khach hang), anh Tuan (khach hang)',
     'Hop demo truc tiep tai van phong khach hang, hen gui bao gia truoc 20/01.', 'sale01', '2026-01-12 11:00:00'),
    (3003, 2002, 'EMAIL', '2026-01-11 08:15:00', 'sale.lead',
     'Gui thu gioi thieu dich vu tu van quy trinh, dinh kem ho so nang luc cong ty.', 'sale.lead', '2026-01-11 08:20:00')
ON DUPLICATE KEY UPDATE
    activity_type = VALUES(activity_type),
    occurred_at   = VALUES(occurred_at),
    participants  = VALUES(participants),
    content       = VALUES(content),
    created_by    = VALUES(created_by);

-- ----------------------------------------------------------------------------
--  DU LIEU NEN BO SUNG CHO NCL-03-CN-007 — BAO CAO DUONG ONG BAN HANG
--  10 co hoi (2003..2012) trai tren ca 5 giai doan de bao cao /opportunities/
--  pipeline-report co du lieu ngay (TC-01). Co hoi 2007 la co hoi "dong lau
--  bat thuong": NEGOTIATION / OPEN, created_at cach hien tai hon 60 ngay va
--  chua co ban ghi opportunity_stage_history nen so ngay o giai doan tinh tu
--  created_at (TC-02).
--  Idempotent qua ON DUPLICATE KEY UPDATE theo id co dinh.
-- ----------------------------------------------------------------------------
INSERT INTO opportunities (id, name, customer_id, expected_value, expected_close_date, stage, status, probability, created_by, created_at)
VALUES
    (2003, 'Nang cap ha tang mang cho Thuong Mai Mien Bac',        1002, 120000000, '2026-11-30', 'APPROACH',    'OPEN',    10,  'sale01',    '2026-08-20 09:00:00'),
    (2004, 'Trien khai cong thong tin noi bo Sao Viet',            1004, 180000000, '2026-12-15', 'APPROACH',    'OPEN',    10,  'pm01',      '2026-08-28 09:00:00'),
    (2005, 'Chuan hoa quy trinh kho van Logistics Toan Cau',       1005, 260000000, '2026-10-31', 'PROPOSAL',    'OPEN',    40,  'pm.lead',   '2026-07-25 09:00:00'),
    (2006, 'Tu van tai chinh - ke toan cho Minh Duc giai doan 2',  1006, 340000000, '2026-10-20', 'PROPOSAL',    'OPEN',    40,  'ketoan01',  '2026-08-05 09:00:00'),
    (2012, 'Mo rong module bao gia cho Giai Phap So Viet',         1001, 300000000, '2026-11-10', 'PROPOSAL',    'OPEN',    40,  'sale01',    '2026-08-12 09:00:00'),
    (2007, 'Dam phan hop dong CRM mo rong An Phat',                1003, 500000000, '2026-09-30', 'NEGOTIATION', 'OPEN',    70,  'sale.lead', '2026-05-20 09:00:00'),
    (2008, 'Dam phan goi bao tri he thong Sao Viet',               1004, 300000000, '2026-10-05', 'NEGOTIATION', 'OPEN',    70,  'pm01',      '2026-08-18 09:00:00'),
    (2009, 'Trien khai ERP giai doan 1 cho Minh Duc',              1006, 350000000, '2026-08-31', 'WON',         'CLOSED',  100, 'ketoan01',  '2026-06-10 09:00:00'),
    (2010, 'Goi ho tro van hanh cho Logistics Toan Cau',          1005, 250000000, '2026-08-20', 'WON',         'CLOSED',  100, 'pm.lead',   '2026-06-25 09:00:00'),
    (2011, 'Du an so hoa tai lieu Thuong Mai Mien Bac',            1002, 150000000, '2026-08-15', 'LOST',        'CLOSED',  0,   'sale01',    '2026-06-18 09:00:00')
ON DUPLICATE KEY UPDATE
    name                = VALUES(name),
    customer_id         = VALUES(customer_id),
    expected_value      = VALUES(expected_value),
    expected_close_date = VALUES(expected_close_date),
    stage               = VALUES(stage),
    status              = VALUES(status),
    probability         = VALUES(probability),
    created_by          = VALUES(created_by);
