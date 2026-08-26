-- Them loai don vi (Trung tam / Ban / Phong / To) de rang buoc cap bac cay to chuc:
-- mot don vi khong duoc truc thuoc don vi co cap thap hon minh (vi du: Ban khong
-- the la con cua Phong). Mac dinh PHONG cho du lieu hien co, sau do phan loai lai
-- theo ten, va tu dong sua cac truong hop vi pham cap bac hien tai bang cach dua
-- ve cap goc (parent_id = NULL).
ALTER TABLE departments
    ADD COLUMN unit_type VARCHAR(20) NOT NULL DEFAULT 'PHONG';

UPDATE departments
    SET unit_type = 'TRUNG_TAM'
    WHERE name LIKE 'Trung Tâm%' OR name LIKE 'Trung tâm%' OR name LIKE 'Trung Tam%' OR name LIKE 'Trung tam%';

UPDATE departments
    SET unit_type = 'BAN'
    WHERE name LIKE 'Ban %' OR name = 'Ban';

UPDATE departments
    SET unit_type = 'TO'
    WHERE name LIKE 'Tổ %' OR name LIKE 'To %' OR name LIKE 'Nhóm %' OR name LIKE 'Nhom %'
       OR name LIKE 'Đội %' OR name LIKE 'Doi %';

-- Tu dong sua du lieu da bi lech cap bac (vi du "Ban Giam Doc" bi keo vao lam con
-- cua mot "Phong"): dua don vi vi pham ve lai cap goc thay vi giu nguyen sai cau truc.
UPDATE departments d
    JOIN departments p ON d.parent_id = p.id
    SET d.parent_id = NULL
    WHERE
        (CASE d.unit_type WHEN 'TRUNG_TAM' THEN 0 WHEN 'BAN' THEN 0 WHEN 'PHONG' THEN 1 WHEN 'TO' THEN 2 ELSE 1 END)
        <
        (CASE p.unit_type WHEN 'TRUNG_TAM' THEN 0 WHEN 'BAN' THEN 0 WHEN 'PHONG' THEN 1 WHEN 'TO' THEN 2 ELSE 1 END);
