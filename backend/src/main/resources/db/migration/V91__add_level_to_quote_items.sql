-- Epic NCL-03: Co hoi ban hang va bao gia
-- NCL-03-CN-003: Lap bao gia cho co hoi (TC-01/TC-02).
--
-- Bang don gia ban (bill_rates) khai bao theo CA vai tro chuyen mon lan cap bac
-- (NCL-07-CN-001), nhung dong bao gia truoc day chi luu vai tro — khi mot vai tro co
-- nhieu cap bac, he thong tra dai mot dong don gia bat ky. Luu them cap bac da chon de
-- tra dung don gia dang hieu luc cua (vai tro, cap bac) va hien thi lai trong lich su
-- bao gia. Cot cho phep NULL de cac bao gia cu (chi co vai tro) van hop le.
ALTER TABLE quote_items
    ADD COLUMN level VARCHAR(100) NULL AFTER professional_role;
