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

-- Chi so unique di theo cot khi doi ten, nhung ten cu (`token`) khong con dung
-- nghia nua. Doi ten cho khop de nguoi doc sau khong hieu nham la con luu token tho.
ALTER TABLE password_reset_tokens
    RENAME INDEX token TO uk_password_reset_tokens_token_hash;
