-- Chuyen tu "lien ket dai" sang "ma 6 so" cho luong khoi phuc mat khau.
--
-- VI SAO PHAI THEM COT `attempts`:
-- Ma 6 so chi co 1.000.000 kha nang, trong khi token cu la 32 byte ngau nhien
-- (2^256). Neu chi doi hinh thuc ma khong them rao chan, ke tan cong chi viec
-- yeu cau khoi phuc cho nan nhan roi do lan luot tu 000000 den 999999 — hoan
-- toan kha thi. Day khong phai rui ro ly thuyet: no la ly do MOI he thong dung
-- ma OTP deu phai dem so lan nhap sai.
--
-- Ba rao chan di kem, thieu mot cai la co che nay yeu han token cu:
--   1. Cot `attempts` duoi day  — qua 5 lan sai thi ma chet, phai xin ma moi.
--   2. Tra cuu gan voi EMAIL     — khong tra cuu bang ma tran, de mot ma doan
--      bua khong the trung vao token cua mot nguoi dung bat ky khac.
--   3. Han dung rut tu 30 xuong 10 phut — thu hep cua so tan cong.
--
-- Cot `token_hash` giu nguyen ten va kieu; gio no chua SHA-256 cua chuoi
-- "<userId>:<ma 6 so>" thay vi cua token dai. Van la mot chieu, CSDL van khong
-- biet ma that.
--
-- Xoa cac dong dang co: chung chua ban bam cua token dai theo cong thuc cu, nen
-- khong the doi chieu voi cong thuc moi. Token von chi song 30 phut.
DELETE FROM password_reset_tokens;

ALTER TABLE password_reset_tokens
    ADD COLUMN attempts INT NOT NULL DEFAULT 0 AFTER token_hash;
