-- Du lieu mo phong: 6 phong ban co ban, khop voi danh sach hien thi o frontend (NCL-01-CN-002)
-- id duoc chi dinh tuong minh de khop voi SYSTEM_DEPARTMENTS trong frontend/src/modules/users/types/userTypes.ts

INSERT INTO departments (id, name) VALUES
    (1, 'Ban Giam Doc'),
    (2, 'Phong Quan Ly Du An (PMO)'),
    (3, 'Phong Kinh Doanh & Phat Trien Thi Truong'),
    (4, 'Phong Ke Toan - Tai Chinh'),
    (5, 'Phong Nhan Su'),
    (6, 'Trung Tam Cong Nghe & Giai Phap')
ON DUPLICATE KEY UPDATE name = VALUES(name);
