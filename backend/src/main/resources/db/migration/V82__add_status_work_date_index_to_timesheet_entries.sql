-- NCL-11-CN-001: bang dieu khien van hanh tong hop gio cong DA DUYET theo khoang work_date cua ca cong ty
-- (khong loc theo nhan su hay cong viec) nen cac index hien co (task_id, user_id + work_date) khong dung duoc
-- va truy van phai quet toan bang. Bang dieu khien khong them bang du lieu moi: cac chi so duoc tinh tu du lieu
-- gio cong, don gia va hoa don san co; nhat ky xem ghi vao audit_logs va sensitive_access_log.
CREATE INDEX idx_timesheet_entries_status_work_date ON timesheet_entries (entry_status, work_date);
