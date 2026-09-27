-- Cai dat - Giao dien: tuy chon giao dien cua tung nguoi dung — chu de (sang/toi/theo he thong), mat do
-- hien thi, man hinh mo dau sau dang nhap, thanh ben thu gon, giam hieu ung. Luu o may chu de di theo tai
-- khoan sang may khac. Khong co dong cho mot user_id nghia la dung mac dinh.
CREATE TABLE IF NOT EXISTS user_preferences (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id            BIGINT NOT NULL,
    theme              VARCHAR(10) NOT NULL DEFAULT 'LIGHT',
    density            VARCHAR(12) NOT NULL DEFAULT 'COMFORTABLE',
    landing_tab        VARCHAR(40) NULL,
    sidebar_collapsed  BOOLEAN NOT NULL DEFAULT FALSE,
    reduce_motion      BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_user_preferences_user UNIQUE (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
