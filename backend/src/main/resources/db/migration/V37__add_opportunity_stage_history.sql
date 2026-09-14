-- Epic NCL-03: Co hoi ban hang
-- NCL-03-CN-002: Chuyen giai doan co hoi (TC-01, TC-05).
--
-- (TC-01) Bo sung cot "xac suat du kien" (probability) de cap nhat xac suat
-- tuong ung voi moi giai doan khi co hoi duoc chuyen sang.
-- (TC-05) Bang lich su chuyen giai doan: luu moi lan chuyen giai doan kem
-- nguoi thuc hien, giai doan cu/moi va thoi diem; giai doan moi duoc kiem
-- soat theo thu tu tu tang service (QTN-06).
ALTER TABLE opportunities
    ADD COLUMN probability DECIMAL(5,2) NULL AFTER status,
    ADD INDEX idx_opportunities_probability (probability);

-- Lich su chuyen giai doan cua co hoi (NCL-03-CN-002, TC-05).
CREATE TABLE opportunity_stage_history (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id      BIGINT NOT NULL,
    from_stage          VARCHAR(30) NULL,
    to_stage            VARCHAR(30) NOT NULL,
    changed_by          BIGINT NULL,
    changed_by_username VARCHAR(100) NULL,
    changed_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stage_history_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
    INDEX idx_stage_history_opportunity (opportunity_id),
    INDEX idx_stage_history_changed_at (changed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;