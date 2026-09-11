-- NCL-05-CN-005: dat ngan sach gio cong cho cong viec.
ALTER TABLE project_tasks
    ADD COLUMN budget_hours   DECIMAL(10,2) NULL AFTER status,
    ADD COLUMN approved_hours DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER budget_hours;
