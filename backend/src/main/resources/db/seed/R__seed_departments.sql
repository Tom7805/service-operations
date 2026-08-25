-- Du lieu mo phong: 6 phong ban co ban, khop voi danh sach hien thi o frontend (NCL-01-CN-002)
-- id duoc chi dinh tuong minh de khop voi SYSTEM_DEPARTMENTS trong frontend/src/modules/users/types/userTypes.ts
-- Cay to chuc: Ban Giam Doc (id 1) la goc; 4 phong nghiep vu (id 2-5) truc thuoc Ban Giam Doc.
-- Trung Tam Cong Nghe & Giai Phap (id 6) la don vi cap goc rieng (trung tam, khong phai "phong").

INSERT INTO departments (id, name, parent_id) VALUES
    (1, 'Ban Giam Doc', NULL),
    (2, 'Phong Quan Ly Du An (PMO)', 1),
    (3, 'Phong Kinh Doanh & Phat Trien Thi Truong', 1),
    (4, 'Phong Ke Toan - Tai Chinh', 1),
    (5, 'Phong Nhan Su', 1),
    (6, 'Trung Tam Cong Nghe & Giai Phap', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id);
