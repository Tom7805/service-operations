-- NCL-05-CN-007: Tao du an tu mau co san cay cong viec.
CREATE TABLE project_templates (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT NULL,
    project_type VARCHAR(30) NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  VARCHAR(100) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_project_templates_code (code),
    INDEX idx_project_templates_active (active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE project_template_items (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id            BIGINT NOT NULL,
    parent_id              BIGINT NULL,
    item_type              VARCHAR(30) NOT NULL,
    name                   VARCHAR(255) NOT NULL,
    description            TEXT NULL,
    sort_order             INT NOT NULL DEFAULT 0,
    suggested_budget_hours DECIMAL(10,2) NULL,
    CONSTRAINT fk_template_items_template FOREIGN KEY (template_id) REFERENCES project_templates (id),
    CONSTRAINT fk_template_items_parent FOREIGN KEY (parent_id) REFERENCES project_template_items (id),
    INDEX idx_template_items_template (template_id),
    INDEX idx_template_items_parent (parent_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Mau mau: "Trien khai phan mem" (dieu kien bat dau cua story: it nhat mot mau du an).
INSERT INTO project_templates (code, name, description, project_type, active, created_by)
VALUES ('MT-PHAN-MEM', 'Mau trien khai phan mem', 'Cay hang muc, cong viec va ngan sach gio goi y cho du an trien khai phan mem', 'FIXED_PRICE', TRUE, 'system');

INSERT INTO project_template_items (template_id, parent_id, item_type, name, description, sort_order, suggested_budget_hours) VALUES
(1, NULL, 'WORK_PACKAGE', 'Khoi tao du an', 'Chuan bi moi truong va ke hoach tong the', 1, NULL),
(1, 1,    'TASK', 'Thiet lap moi truong trien khai', NULL, 1, 8.00),
(1, 1,    'TASK', 'Lap ke hoach chi tiet', NULL, 2, 16.00),
(1, NULL, 'WORK_PACKAGE', 'Phat trien tinh nang', 'Cac cong viec xay dung tinh nang theo yeu cau', 2, NULL),
(1, 4,    'TASK', 'Phan tich va thiet ke chi tiet', NULL, 1, 40.00),
(1, 4,    'TASK', 'Lap trinh tinh nang', NULL, 2, 120.00),
(1, 4,    'TASK', 'Kiem thu noi bo', NULL, 3, 40.00),
(1, NULL, 'WORK_PACKAGE', 'Ban giao va dao tao', 'Ho so ban giao, huan luyen va nghiem thu', 3, NULL),
(1, 8,    'TASK', 'Soan ho so ban giao', NULL, 1, 24.00),
(1, 8,    'TASK', 'Dao tao nguoi dung', NULL, 2, 16.00),
(1, 8,    'TASK', 'Nghiem thu va ban giao', NULL, 3, 8.00);
