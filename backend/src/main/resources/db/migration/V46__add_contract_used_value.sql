-- Epic NCL-04: Quan ly hop dong
-- NCL-04-CN-005: Canh bao khi sap vuot han muc hop dong
--
-- used_value la gia tri da dung cua hop dong, cong don tu gio cong da duyet va
-- hoa don da lap (TC-01), dung de so sanh voi limit_value va canh bao khi dat
-- nguong tam muoi phan tram (QTN-19). Mac dinh 0 - hop dong moi tao chua dung
-- gi. Khong lien quan toi total_value (gia tri hop dong) hay limit_value (han
-- muc tran, khai bao o V43).
ALTER TABLE contracts
    ADD COLUMN used_value DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER limit_value;
