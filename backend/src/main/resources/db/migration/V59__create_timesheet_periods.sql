-- NCL-06-CN-005 (TC-03): ky cham cong dung de khoa/mo gio cong theo khoang ngay.
-- Bang duoc tao truoc boi story dieu chinh but toan dao de co cho kiem tra "ky
-- chua dong goc da bi khoa"; man hinh quan tri khoa/mo ky day du thuoc story
-- NCL-06-CN-006 (khoa ky cham cong).
CREATE TABLE timesheet_periods (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    locked_by    VARCHAR(100) NULL,
    locked_at    DATETIME NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_timesheet_periods_start UNIQUE (period_start),
    INDEX idx_timesheet_periods_range (period_start, period_end)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
