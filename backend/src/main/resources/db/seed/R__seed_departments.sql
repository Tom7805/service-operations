-- Du lieu mo phong: 6 phong ban co ban, khop voi danh sach hien thi o frontend (NCL-01-CN-002)
-- id duoc chi dinh tuong minh de khop voi SYSTEM_DEPARTMENTS trong frontend/src/modules/users/types/userTypes.ts
-- Cay to chuc: Ban Giam Doc (id 1) la goc; 4 phong nghiep vu (id 2-5) truc thuoc Ban Giam Doc.
-- Trung Tam Cong Nghe & Giai Phap (id 6) la don vi cap goc rieng (trung tam, khong phai "phong").

INSERT INTO departments (id, name, parent_id) VALUES
    (1, 'Ban Giám Đốc', NULL),
    (2, 'Phòng Quản Lý Dự Án (PMO)', 1),
    (3, 'Phòng Kinh Doanh & Phát Triển Thị Trường', 1),
    (4, 'Phòng Kế Toán - Tài Chính', 1),
    (5, 'Phòng Nhân Sự', 1),
    (6, 'Trung Tâm Công Nghệ & Giải Pháp', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id);
