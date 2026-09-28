-- NCL-09-CN-002: bo sung "cap bac" (level) vao ho so nhan su.
-- Ly do: tinh doanh thu ghi nhan tu dong cho hop dong theo gio can tra dung don gia
-- (bill_rates/contract_bill_rates, khoa theo professional_role + level + effective_from),
-- nhung NCL-07-CN-005 truoc day chi phuc vu tra cuu tung dong don le nen bat Frontend
-- nhap tay "level" moi lan goi API - khong the tu dong hoa cho ca du an. Cot nay cho phep
-- RateResolutionService tu suy ra level tu chinh ho so nhan su khi tinh hang loat.
-- Nullable vi ho so cu chua duoc khai bao cap bac; dong gio cong cua nhan su chua co
-- level se duoc danh dau missingRateData thay vi chan ca luot tinh doanh thu.
ALTER TABLE employees
    ADD COLUMN level VARCHAR(100) NULL AFTER professional_role;
