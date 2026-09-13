-- NCL-06-CN-001: them cot billable cho phep danh dau gio cong co tinh phi hay khong.
-- Mac dinh la true (tinh phi) de tuong thich voi du lieu cu neu co.
ALTER TABLE timesheet_entries
    ADD COLUMN billable BOOLEAN NOT NULL DEFAULT true AFTER note;