-- NCL-09-CN-004: nguong bien loi nhuan toi thieu de canh bao du an am bien.
-- Cau hinh toan cong ty (khong theo tung du an) - Ban giam doc dat mot gia tri duy nhat,
-- ap dung cho moi du an khi tinh lai bien loi nhuan (NCL-09-CN-003). Chi giu 1 dong hien
-- hanh (upsert o tang service), khong luu lich su cac lan doi truoc do.
CREATE TABLE margin_threshold_settings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    min_margin_rate DECIMAL(6,4) NOT NULL,
    updated_by VARCHAR(100),
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id)
);
