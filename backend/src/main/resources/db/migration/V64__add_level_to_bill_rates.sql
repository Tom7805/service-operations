-- NCL-07-CN-001: bổ sung "cấp bậc" (level) cho bảng đơn giá theo vai trò.
-- AC yêu cầu mỗi dòng đơn giá gồm vai trò chuyên môn + cấp bậc + đơn giá,
-- nhưng bản đầu chỉ có vai trò (cấp bậc bị lồng vào tên vai trò dạng text tự do).
-- Dữ liệu cũ được backfill 'Chưa phân loại' để không phá ràng buộc NOT NULL.
ALTER TABLE bill_rates
    ADD COLUMN level VARCHAR(100) NOT NULL DEFAULT 'Chưa phân loại' AFTER professional_role;

ALTER TABLE bill_rates
    DROP INDEX uq_bill_rates_role_effective,
    DROP INDEX idx_bill_rates_lookup;

ALTER TABLE bill_rates
    ADD UNIQUE KEY uq_bill_rates_role_level_effective (professional_role, level, effective_from),
    ADD INDEX idx_bill_rates_lookup (professional_role, level, effective_from);
