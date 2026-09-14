-- Nhat ky thao tac he thong (audit_logs): luu them MA VAI TRO cua nguoi thuc hien tai thoi diem
-- ghi log, de man "Nhat ky he thong" hien "@user - Ten vai tro" o cot NGUOI THUC HIEN cho MOI dong
-- (nghiep vu lan bao mat), khong phai suy dien tu detail. NULL cho cac dong cu / thao tac he thong.
ALTER TABLE audit_logs
    ADD COLUMN actor_role VARCHAR(20) NULL AFTER actor_username;
