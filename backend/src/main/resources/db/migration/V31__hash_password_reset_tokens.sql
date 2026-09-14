-- Luu BAN BAM cua token khoi phuc mat khau thay vi token tho.
--
-- Truoc day cot `token` giu nguyen chuoi ma nguoi dung nhan duoc trong lien ket.
-- Hau qua: bat ky ai doc duoc noi dung bang nay deu dat lai duoc mat khau cua
-- nguoi khac — mot ban sao luu bi ro, mot lo hong SQL injection chi-doc, hay
-- don gian la mot quan tri CSDL cung du de chiem tai khoan. Day la cung mot loai
-- sai lam voi viec luu mat khau dang chu tho.
--
-- Gio CSDL chi giu SHA-256 cua token. Ban tho chi ton tai trong lien ket gui toi
-- dung nguoi dung do va khong duoc luu lai o dau. Khi dat lai mat khau, may chu
-- bam chuoi nhan duoc roi tra cuu theo ban bam.
--
-- Vi sao khong dung bcrypt/argon2 nhu voi mat khau: token la chuoi ngau nhien
-- 256 bit tu SecureRandom, khong the doan hay do tu dien, nen khong can ham bam
-- cham. SHA-256 la du va nhanh hon nhieu.
--
-- Xoa cac dong dang co: chung chua token THO va khong the chuyen doi nguoc thanh
-- ban bam (bam la mot chieu). Token nay von chi song 30 phut va dung mot lan, nen
-- anh huong toi da la vai nguoi dang cho thu phai bam "quen mat khau" lai.
DELETE FROM password_reset_tokens;

ALTER TABLE password_reset_tokens
    CHANGE COLUMN token token_hash CHAR(64) NOT NULL;

-- KHONG doi ten chi so unique o day, du ten cu (`token`) gio doc ra hoi lech nghia.
-- Ly do: `RENAME INDEX token TO ...` phu thuoc vao viec chi so DUNG TEN `token`.
-- Ten do la do MySQL tu dat khi gap `token VARCHAR(255) NOT NULL UNIQUE` trong
-- CREATE TABLE — dung trong phan lon truong hop, nhung khong co gi bao dam voi mot
-- CSDL da qua sua tay hay phuc hoi tu ban sao luu. Neu ten khac, cau lenh nem loi
-- va Flyway dung o trang thai that bai giua chung: ung dung khong len duoc, va con
-- phai go tay `flyway_schema_history` moi chay lai duoc.
--
-- Doi lay mot cai ten dep khong dang de mang rui ro do. Chi so van hoat dong dung:
-- MySQL giu no theo cot khi doi ten cot, chi la ten thi khong con khop nghia.
