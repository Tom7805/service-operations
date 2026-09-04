-- =============================================================================
--  DU LIEU NEN — CO HOI BAN HANG MAU (NCL-03-CN-006)
-- =============================================================================
--  Chay SAU R__seed_sample_customers.sql (Flyway chay migration repeatable
--  theo thu tu TEN FILE): opportunities.customer_id la khoa ngoai toi
--  customers.id nen can bang customers co san truoc.
--
--  Muc dich: co san vai co hoi + vai hoat dong cham soc de xem ngay dong thoi
--  gian tren giao dien / thu API (GET, POST .../activities) ma khong phai
--  cho NCL-03-CN-001 (tao co hoi) hoan thien truoc — story do se tu bo sung
--  du lieu that qua man hinh tao co hoi khi trien khai.
--
--  Co hoi 2001 gan voi khach hang 1001 (chu so huu sale01); co hoi 2002 gan
--  voi khach hang 1003 (chu so huu sale.lead) — dung tai khoan tuong ung de
--  dang nhap va thu chuc nang ghi nhan hoat dong cham soc.
--
--  Idempotent qua ON DUPLICATE KEY UPDATE theo id co dinh.
-- ----------------------------------------------------------------------------
INSERT INTO opportunities (id, customer_id, name, status, created_by, created_at)
VALUES
    (2001, 1001, 'Trien khai he thong CRM cho Cong ty CP Giai Phap So Viet', 'OPEN', 'sale01', '2026-01-05 09:00:00'),
    (2002, 1003, 'Tu van quy trinh xay dung so cho An Phat', 'OPEN', 'sale.lead', '2026-01-10 10:30:00')
ON DUPLICATE KEY UPDATE
    name       = VALUES(name),
    status     = VALUES(status),
    created_by = VALUES(created_by);

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
