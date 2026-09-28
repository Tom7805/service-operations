-- NCL-06-CN-005: dau vet cac lan dieu chinh gio cong da duyet bang but toan dao.
-- Noi dong goc, dong dao va dong sua lai voi nhau de tra cuu duoc toan bo
-- lich su dieu chinh cua mot dong gio cong (QTN-11).
CREATE TABLE timesheet_entry_adjustments (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    original_entry_id  BIGINT NOT NULL,
    reversal_entry_id  BIGINT NOT NULL,
    corrected_entry_id BIGINT NOT NULL,
    task_id            BIGINT NOT NULL,
    user_id            BIGINT NOT NULL,
    work_date          DATE NOT NULL,
    reason             VARCHAR(1000) NOT NULL,
    adjusted_by        VARCHAR(100) NULL,
    adjusted_at        DATETIME NOT NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tsea_original_entry FOREIGN KEY (original_entry_id) REFERENCES timesheet_entries (id),
    CONSTRAINT fk_tsea_reversal_entry FOREIGN KEY (reversal_entry_id) REFERENCES timesheet_entries (id),
    CONSTRAINT fk_tsea_corrected_entry FOREIGN KEY (corrected_entry_id) REFERENCES timesheet_entries (id),
    CONSTRAINT fk_tsea_task FOREIGN KEY (task_id) REFERENCES project_tasks (id),
    CONSTRAINT fk_tsea_user FOREIGN KEY (user_id) REFERENCES users (id),
    INDEX idx_tsea_task (task_id),
    INDEX idx_tsea_original_entry (original_entry_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
