-- Epic NCL-03: Co hoi ban hang
-- NCL-03-CN-006: Ghi nhan hoat dong cham soc co hoi (TC-01).
--
-- Mot hoat dong cham soc (goi dien, gap mat, thu dien tu, ghi chu khac) gan
-- voi mot co hoi da co san (bang `opportunities`, tao tu V35). Nhieu hoat
-- dong cua cung mot co hoi tao thanh dong thoi gian cham soc cua co hoi do.
-- Chi duoc them khi co hoi con o trang thai OPEN (TC-02) — kiem soat o tang
-- service, khong rang buoc o DB vi con phai tra loi ro rang "co hoi da dong"
-- thay vi loi FK/CHECK chung chung.
CREATE TABLE opportunity_activities (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT NOT NULL,
    activity_type  VARCHAR(20) NOT NULL,
    occurred_at    DATETIME NOT NULL,
    participants   VARCHAR(500) NULL,
    content        VARCHAR(2000) NOT NULL,
    created_by     VARCHAR(100) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_opportunity_activities_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
    INDEX idx_opportunity_activities_opportunity (opportunity_id),
    INDEX idx_opportunity_activities_occurred (occurred_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
