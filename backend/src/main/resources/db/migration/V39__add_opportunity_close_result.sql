-- Epic NCL-03: Co hoi ban hang
-- NCL-03-CN-005: Ghi nhan ket qua thang/thua cua co hoi (TC-01, TC-02, TC-04).
--
-- Bo sung cac cot luu lai ket qua khi dong co hoi de phuc vu bao cao va rut
-- kinh nghiem cho cac lan sau: ly do thua (loss_reason, bat buoc khi dong voi
-- ket qua LOST - TC-02, kiem soat o tang service), ghi chu chi tiet
-- (close_reason_detail), doi thu canh tranh neu co (competitor_name) va thoi
-- diem dong (closed_at).
ALTER TABLE opportunities
    ADD COLUMN loss_reason         VARCHAR(30)  NULL AFTER probability,
    ADD COLUMN close_reason_detail VARCHAR(500) NULL AFTER loss_reason,
    ADD COLUMN competitor_name     VARCHAR(255) NULL AFTER close_reason_detail,
    ADD COLUMN closed_at           DATETIME     NULL AFTER competitor_name,
    ADD INDEX idx_opportunities_loss_reason (loss_reason);
