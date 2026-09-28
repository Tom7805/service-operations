ALTER TABLE project_expenses
    ADD COLUMN invoiced BOOLEAN NOT NULL DEFAULT FALSE AFTER billable;