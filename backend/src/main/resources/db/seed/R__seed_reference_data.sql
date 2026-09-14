-- =============================================================================
--  DỮ LIỆU NỀN (2/3) — CẤU HÌNH MẶC ĐỊNH
-- =============================================================================
--  Chạy sau R__seed_departments.sql (cần bảng `roles`).
--  Xem đầu R__seed_departments.sql để biết toàn bộ chuỗi seed 3 file.
-- =============================================================================

-- ----------------------------------------------------------------------------
--  Xác thực hai bước theo vai trò (NCL-01-CN-009).
--  Tạo sẵn đủ 9 dòng, MẶC ĐỊNH TẮT — để màn hình cấu hình có đủ hàng ngay từ
--  lần chạy đầu. Quản trị viên tự bật cho vai trò xem dữ liệu tài chính.
--  (Service cũng tự tạo dòng khi thiếu, nên seed này chỉ là để hiển thị sớm.)
-- ----------------------------------------------------------------------------
INSERT INTO two_factor_settings (role_id, enabled)
SELECT r.id, FALSE
FROM roles r
WHERE NOT EXISTS (
    SELECT 1 FROM two_factor_settings t WHERE t.role_id = r.id
);
