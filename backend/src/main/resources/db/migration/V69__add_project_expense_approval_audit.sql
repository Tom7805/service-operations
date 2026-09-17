ALTER TABLE project_expenses
    ADD COLUMN approved_by VARCHAR(100) NULL,
    ADD COLUMN approved_at DATETIME NULL,
    ADD COLUMN rejected_by VARCHAR(100) NULL,
    ADD COLUMN rejected_at DATETIME NULL,
    ADD COLUMN reject_reason VARCHAR(1000) NULL;