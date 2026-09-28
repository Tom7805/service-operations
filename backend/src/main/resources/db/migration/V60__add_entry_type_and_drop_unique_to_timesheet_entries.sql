-- NCL-06-CN-005: dieu chinh gio cong da duyet bang but toan dao (QTN-11).
-- Bo rang buoc duy nhat (user, task, ngay): mot lan dieu chinh sinh them hai
-- dong moi (dao + sua) cung ba gia tri nay voi dong goc — dong goc van giu
-- nguyen. Rang buoc "khong tao 2 ban ghi GOC cho cung user/task/ngay" chuyen
-- sang kiem tra o tang ung dung (TimeEntryServiceImpl#create).
ALTER TABLE timesheet_entries
    DROP INDEX uk_timesheet_entries_user_task_date;

-- Danh dau vai tro cua tung dong trong luong dieu chinh: ORIGINAL (mac dinh,
-- ban ghi binh thuong) / REVERSAL (dong dao) / CORRECTION (dong sua).
ALTER TABLE timesheet_entries
    ADD COLUMN entry_type VARCHAR(20) NOT NULL DEFAULT 'ORIGINAL' AFTER entry_status;
