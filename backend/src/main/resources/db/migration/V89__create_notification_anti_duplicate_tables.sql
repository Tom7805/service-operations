-- NCL-14-CN-003 (QTN-27): chong gui trung thong bao cho cac su kien duoc tac vu nen ra soat dinh
-- ky. Tach 3 bang rieng, KHONG dung chung voi `notifications`/cac co che chong trung rieng da co
-- (margin alert/timesheet reminder/dunning) de tranh phai them constraint len du lieu cu cua
-- chung.

-- Cau hinh chong trung theo loai su kien (TC-03/TC-04) — chi Quan tri vien (VT-07) duoc sua.
CREATE TABLE IF NOT EXISTS notification_dedup_configs (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type     VARCHAR(50) NOT NULL,
    dedup_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    cooldown_hours INT,
    updated_by     VARCHAR(100),
    updated_at     DATETIME,
    CONSTRAINT uq_notification_dedup_configs_event_type UNIQUE (event_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Trang thai canh bao hien tai cua tung ban ghi (vd Task) cho tung loai su kien (TC-02) — doc lap
-- voi nguoi nhan, dung de sinh episode_no cho notification_alert_dedup_logs.
CREATE TABLE IF NOT EXISTS notification_alert_states (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type    VARCHAR(50) NOT NULL,
    reference_id  BIGINT NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT FALSE,
    episode_no    INT NOT NULL DEFAULT 0,
    last_alert_at DATETIME,
    CONSTRAINT uq_notification_alert_states_event_reference UNIQUE (event_type, reference_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Da gui cho recipient nay o dot canh bao (episode) nay chua (TC-01) — append-only.
CREATE TABLE IF NOT EXISTS notification_alert_dedup_logs (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type    VARCHAR(50) NOT NULL,
    reference_id  BIGINT NOT NULL,
    recipient_id  BIGINT NOT NULL,
    episode_no    INT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_alert_dedup_logs_key UNIQUE (event_type, reference_id, recipient_id, episode_no)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
