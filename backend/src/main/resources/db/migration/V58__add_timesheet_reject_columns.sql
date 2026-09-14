-- NCL-06-CN-004: tu choi bang cham cong.
-- Ghi lai lan tu choi gan nhat khien bang chuyen han sang REJECTED (TC-01, TC-04):
-- rejected_by/rejected_at la nguoi/thoi diem tu choi, reject_reason la ly do bat buoc (TC-02).
ALTER TABLE timesheets
    ADD COLUMN rejected_by    VARCHAR(100) NULL AFTER approved_at,
    ADD COLUMN rejected_at    DATETIME NULL AFTER rejected_by,
    ADD COLUMN reject_reason  VARCHAR(1000) NULL AFTER rejected_at;
