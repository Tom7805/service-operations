-- NCL-01-CN-008: dem phien ban token de vo hieu hoa cac JWT da phat hanh
-- truoc do khi nguoi dung doi/khoi phuc mat khau (khong can bang phien tap trung).
ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
