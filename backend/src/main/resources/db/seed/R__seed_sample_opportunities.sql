-- =============================================================================
--  DU LIEU NEN — CO HOI BAN HANG MAU (NCL-03-CN-006)
-- =============================================================================
--  Chay SAU R__seed_sample_customers.sql (Flyway chay migration repeatable
--  theo thu tu TEN FILE): opportunities.customer_id la khoa ngoai toi
--  customers.id nen can bang customers co san truoc. Bang `opportunities`
--  duoc tao boi V35 (NCL-03-CN-001) — file nay chi seed du lieu, khong tao
--  bang.
--
--  RUT GON (2026-09-22): truoc day file nay + R__seed_sample_revenue_forecast_
--  demo_opportunities.sql cong lai seed toi 22 co hoi, phan lon gan voi
--  khach hang KHONG PHAI la 2 khach hang sale01 thuc su phu trach (1001, 1002)
--  — dang nhap sale01 thay ten khach hang la nhung cong ty khac (Sao Viet,
--  Logistics Toan Cau, VietTinBank...) rat kho hieu, gay nham tuong du lieu
--  seed sai/mo coi. Gio CHI con dung 2 co hoi, moi co hoi mot khach hang, ca
--  hai deu la khach hang THAT sale01 dang phu trach (owner_id = sale01) —
--  dong bo voi nhung gi trang "Khach hang" cua sale01 dang hien (xem
--  R__seed_sample_customers.sql: 1001, 1002 la 2/6 khach hang thuoc sale01).
--
--  DON DEP: xoa toan bo cac co hoi mau CU (2003..2014) khong con dung nua —
--  DELETE nam o day (khong phai o migration V, vi day la file repeatable,
--  Flyway se CHAY LAI moi khi noi dung file thay doi) de dong doi keo code
--  moi ve, seed lai tu dau, DB cua ho cung tu dong xoa sach cac ban ghi cu,
--  khong con canh "moi nguoi mot bo du lieu khac nhau". opportunity_activities/
--  opportunity_stage_history gan voi cac id nay tu xoa theo (ON DELETE CASCADE,
--  xem V37/V40) — da kiem tra khong co quotes/contracts nao gan voi cac id
--  nay nen xoa an toan, khong vuong khoa ngoai.
-- ----------------------------------------------------------------------------
DELETE FROM opportunities WHERE id IN (2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014);

-- ----------------------------------------------------------------------------
--  2 CO HOI CON LAI — moi co hoi mot khach hang, ca hai deu la khach hang that
--  cua sale01 (1001, 1002). Ca hai o giai doan APPROACH / trang thai OPEN nen
--  van them duoc hoat dong cham soc moi. probability = 10 dung QTN-06/
--  StageTransitionValidator.initialProbability() (giai doan dau tien).
--
--  owner_id gan bang JOIN toi users.id theo created_by ('sale01') — QUAN
--  TRONG tu khi OpportunityServiceImpl.list() ap dung pham vi du lieu QTN-01:
--  co hoi thieu owner_id se AN VOI tai khoan pham vi SELF/DEPARTMENT.
--
--  Idempotent qua ON DUPLICATE KEY UPDATE theo id co dinh.
-- ----------------------------------------------------------------------------
INSERT INTO opportunities (id, name, customer_id, expected_value, expected_close_date, stage, status, probability, created_by, created_at, owner_id)
SELECT o.id, o.name, o.customer_id, o.expected_value, o.expected_close_date, o.stage, o.status, o.probability, o.created_by, o.created_at, u.id
FROM (
              SELECT 2001 AS id, 'Trien khai he thong CRM cho Cong ty CP Giai Phap So Viet' AS name, 1001 AS customer_id, 500000000 AS expected_value, '2026-06-30' AS expected_close_date, 'APPROACH' AS stage, 'OPEN' AS status, 10 AS probability, 'sale01' AS created_by, '2026-01-05 09:00:00' AS created_at
    UNION ALL SELECT 2002, 'Nang cap ha tang mang cho Cong ty TNHH Thuong Mai Mien Bac', 1002, 120000000, '2026-11-30', 'APPROACH', 'OPEN', 10, 'sale01', '2026-01-10 10:30:00'
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

INSERT INTO opportunity_activities (id, opportunity_id, activity_type, occurred_at, participants, content, created_by, created_at)
VALUES
    (3001, 2001, 'CALL', '2026-01-06 14:00:00', 'sale01, chi Lan (khach hang)',
     'Goi gioi thieu giai phap CRM, khach hang quan tam module bao gia tu dong.', 'sale01', '2026-01-06 14:05:00'),
    (3002, 2001, 'MEETING', '2026-01-12 09:30:00', 'sale01, anh Minh (khach hang), anh Tuan (khach hang)',
     'Hop demo truc tiep tai van phong khach hang, hen gui bao gia truoc 20/01.', 'sale01', '2026-01-12 11:00:00'),
    (3003, 2002, 'EMAIL', '2026-01-11 08:15:00', 'sale01',
     'Gui thu khao sat hien trang ha tang mang, hen lich khao sat truc tiep tuan sau.', 'sale01', '2026-01-11 08:20:00')
ON DUPLICATE KEY UPDATE
    activity_type = VALUES(activity_type),
    occurred_at   = VALUES(occurred_at),
    participants  = VALUES(participants),
    content       = VALUES(content),
    created_by    = VALUES(created_by);
