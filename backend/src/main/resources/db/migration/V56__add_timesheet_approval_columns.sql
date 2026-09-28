-- NCL-06-CN-003: duyet bang cham cong (CV-02 - thiet ke du lieu duyet).
-- Them vet nguoi duyet vao bang tuan: approved_by/approved_at ghi lai PM da
-- duyet (TC-04). Trang thai bang = APPROVED khi khong con entry SUBMITTED nao
-- trong tuan (truong hop tuan co gio cong nhieu du an nhieu PM thi duyet
-- tung phan — TC-02 — bang chi APPROVED khi phan cuoi cung duoc duyet).
ALTER TABLE timesheets
    ADD COLUMN approved_by VARCHAR(100) NULL AFTER submitted_at,
    ADD COLUMN approved_at DATETIME NULL AFTER approved_by;
