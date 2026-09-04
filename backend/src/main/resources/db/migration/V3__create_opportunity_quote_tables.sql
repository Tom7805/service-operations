-- Epic NCL-03: Co hoi ban hang va bao gia
-- V3 hien tai chi tao truoc phan can thiet cho NCL-03-CN-006 (Ghi nhan hoat
-- dong cham soc co hoi): bang `opportunities` o day chi gom cac cot du de
-- story nay hoat dong duoc — dinh danh co hoi, khach hang gan voi, trang
-- thai mo/dong (TC-02). Cac story con lai cua epic (NCL-03-CN-001, 002, 003,
-- 004, 005, 007) se ALTER TABLE de bo sung cot con thieu (gia tri du kien,
-- giai doan ban hang, nguoi phu trach, ket qua thang/thua...) va tao rieng
-- bang `quotes` / `quote_lines` / `opportunity_stage_history` khi trien
-- khai — giong cach bang `customers` da tien hoa dan qua V20/V25/V26/V34
-- thay vi tao san toan bo tu dau.

CREATE TABLE opportunities (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    name        VARCHAR(255) NOT NULL,
    status      VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    created_by  VARCHAR(100) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_opportunities_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
    INDEX idx_opportunities_customer (customer_id),
    INDEX idx_opportunities_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- NCL-03-CN-006: mot hoat dong cham soc (goi dien, gap mat, thu dien tu...)
-- gan voi mot co hoi, nhieu hoat dong cua cung co hoi tao thanh dong thoi
-- gian cham soc cua co hoi do (TC-01). Chi duoc them khi co hoi con o trang
-- thai OPEN (TC-02) — kiem soat o tang service, khong rang buoc o DB vi con
-- phai tra loi ro rang "co hoi da dong" thay vi loi FK/CHECK chung chung.
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

-- NCL-03-CN-006 (TC-04): Nhat ky co hoi — ghi nguoi thuc hien, noi dung va
-- thoi diem cua cac thao tac nghiep vu tren co hoi. Dung chung cho toan bo
-- Epic NCL-03 tren cung bang nay, giong quy uoc `customer_audit_logs`.
CREATE TABLE opportunity_audit_logs (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT NULL,
    action_type    VARCHAR(30) NOT NULL,
    detail         VARCHAR(1000) NULL,
    actor_id       BIGINT NULL,
    actor_username VARCHAR(100) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_opportunity_audit_opportunity (opportunity_id),
    INDEX idx_opportunity_audit_actor (actor_id),
    INDEX idx_opportunity_audit_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
