-- ----------------------------------------------------------------------------
--  Backfill cot `level` (cap bac) cho cac ho so nhan su da ton tai truoc khi
--  V73__add_level_to_employees.sql them cot nay — seed goc
--  (R__seed_roles_permissions.sql) tao du lieu truoc do khong dien level nen
--  toan bo deu NULL, khien tinh nang "tu dien cap bac theo ho so nhan su"
--  (NCL-07-CN-005) khong co gi de dien.
--
--  Suy level tu `professional_role` (khong phu thuoc username) de ap dung
--  duoc cho ca nhung tai khoan tao sau nay ngoai seed goc (vi du qua man hinh
--  "Quan ly tai khoan nguoi dung" hoac "Nhap du lieu tu tep"), khong chi 15
--  user co san trong seed.
--
--  Gia tri khop dung 3 muc da dung san trong R__seed_bill_rates.sql (Quan ly /
--  Cao cap / Trung cap) de dong bo voi bang don gia ban. Chi ghi de khi con
--  NULL — khong dam len cap bac da duoc khai bao thu cong sau nay.
-- ----------------------------------------------------------------------------

-- Cap Quan ly: giam doc, truong phong/trung tam, va vai tro "Quan ly du an".
UPDATE employees
SET level = 'Quản lý'
WHERE level IS NULL
  AND (
       professional_role LIKE '%Tổng giám đốc%'
    OR professional_role LIKE '%Giám đốc%'
    OR professional_role LIKE '%Trưởng phòng%'
    OR professional_role = 'Quản lý dự án'
  );

-- Cap Cao cap: truong nhom chuyen mon (van la nguoi lam truc tiep, khong quan
-- ly ca phong ban) — dev/tu van/QA lead.
UPDATE employees
SET level = 'Cao cấp'
WHERE level IS NULL
  AND professional_role LIKE '%Trưởng nhóm%';

-- Con lai (nhan vien/chuyen vien/ky su/ke toan vien...): Trung cap.
UPDATE employees
SET level = 'Trung cấp'
WHERE level IS NULL;
