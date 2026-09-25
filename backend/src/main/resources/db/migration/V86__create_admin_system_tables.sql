-- Epic NCL-15: Quan tri he thong va danh muc.
-- V14 (placeholder rong) da duoc ap tren CSDL cua ca nhom nen khong sua lai (doi checksum se lam
-- Flyway validate that bai); bang cua Epic nay tao o day — cung cach V83/V84 lam voi V11/V12.

-- NCL-15-CN-001: danh muc dich vu dung chung cho bao gia va hoa don.
--  * name_normalized: ten da chuan hoa (bo khoang trang thua, chu thuong) — chan trung ten (TC-02)
--    ngay o tang du lieu, ke ca khi hai request tao cung luc.
CREATE TABLE service_catalog_items (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    code                VARCHAR(30)  NULL,
    name                VARCHAR(255) NOT NULL,
    name_normalized     VARCHAR(255) NOT NULL,
    unit                VARCHAR(50)  NOT NULL,
    description         VARCHAR(1000) NULL,
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_service_catalog_items_code UNIQUE (code),
    CONSTRAINT uq_service_catalog_items_name UNIQUE (name_normalized)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Gia dich vu theo ngay hieu luc (QTN-28). Doi gia = them dong moi, KHONG ghi de dong cu.
CREATE TABLE service_prices (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_item_id     BIGINT        NOT NULL,
    price               DECIMAL(18,2) NOT NULL,
    effective_from      DATE          NOT NULL,
    note                VARCHAR(500)  NULL,
    created_by          VARCHAR(100)  NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_prices_item FOREIGN KEY (service_item_id) REFERENCES service_catalog_items (id),
    CONSTRAINT uq_service_prices_item_date UNIQUE (service_item_id, effective_from)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- NCL-15-CN-002: thong tin cong ty va moc ky tai chinh — mot dong duy nhat (id = 1).
CREATE TABLE company_settings (
    id                              BIGINT PRIMARY KEY,
    company_name                    VARCHAR(255) NOT NULL,
    tax_code                        VARCHAR(50)  NULL,
    address                         VARCHAR(500) NULL,
    phone                           VARCHAR(30)  NULL,
    email                           VARCHAR(255) NULL,
    currency                        VARCHAR(10)  NOT NULL,
    fiscal_year_start_month         INT          NOT NULL,
    standard_working_days_per_month INT          NOT NULL,
    updated_by                      VARCHAR(100) NULL,
    updated_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- NCL-15-CN-003: ban sao luu. Tep nam tren dia (app.backup.dir); bang nay giu trang thai va checksum
-- de phat hien ban sao dang do (IN_PROGRESS), loi (FAILED) hoac bi sua (sai SHA-256) — TC-02.
CREATE TABLE backup_records (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    code                VARCHAR(40)  NULL,
    status              VARCHAR(20)  NOT NULL,
    trigger_type        VARCHAR(20)  NOT NULL,
    file_name           VARCHAR(255) NULL,
    size_bytes          BIGINT       NULL,
    checksum_sha256     VARCHAR(64)  NULL,
    table_count         INT          NULL,
    row_count           BIGINT       NULL,
    note                VARCHAR(500) NULL,
    error_message       VARCHAR(1000) NULL,
    created_by          VARCHAR(100) NULL,
    started_at          DATETIME     NOT NULL,
    completed_at        DATETIME     NULL,
    CONSTRAINT uq_backup_records_code UNIQUE (code),
    INDEX idx_backup_records_started (started_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- QTN-30: phuc hoi phai qua hai buoc. Buoc 1 tao yeu cau (luu bam cua ma xac nhan, het han sau vai phut),
-- buoc 2 gui lai ma + nhap lai mat khau cua chinh quan tri vien da tao yeu cau.
CREATE TABLE restore_requests (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    backup_id           BIGINT       NOT NULL,
    requested_by        VARCHAR(100) NOT NULL,
    token_hash          VARCHAR(64)  NOT NULL,
    status              VARCHAR(20)  NOT NULL,
    failed_attempts     INT          NOT NULL DEFAULT 0,
    requested_at        DATETIME     NOT NULL,
    expires_at          DATETIME     NOT NULL,
    completed_at        DATETIME     NULL,
    error_message       VARCHAR(1000) NULL,
    CONSTRAINT fk_restore_requests_backup FOREIGN KEY (backup_id) REFERENCES backup_records (id),
    INDEX idx_restore_requests_backup (backup_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- NCL-15-CN-004: moi lan tai tep len la mot phien nhap. Noi dung tep giu lai de buoc xac nhan nhap
-- kiem tra lai tren du lieu moi nhat (co the da doi tu luc xem truoc).
CREATE TABLE import_jobs (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_type         VARCHAR(20)  NOT NULL,
    status              VARCHAR(30)  NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_content        MEDIUMTEXT   NOT NULL,
    total_rows          INT          NOT NULL DEFAULT 0,
    valid_rows          INT          NOT NULL DEFAULT 0,
    invalid_rows        INT          NOT NULL DEFAULT 0,
    duplicate_rows      INT          NOT NULL DEFAULT 0,
    created_count       INT          NOT NULL DEFAULT 0,
    updated_count       INT          NOT NULL DEFAULT 0,
    skipped_count       INT          NOT NULL DEFAULT 0,
    failed_count        INT          NOT NULL DEFAULT 0,
    duplicate_action    VARCHAR(20)  NULL,
    created_by          VARCHAR(100) NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    committed_by        VARCHAR(100) NULL,
    committed_at        DATETIME     NULL,
    INDEX idx_import_jobs_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Cac dong loi cua mot phien nhap (khong hop le luc xem truoc, hoac that bai luc nhap) — de sua lai.
CREATE TABLE import_errors (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    import_job_id       BIGINT        NOT NULL,
    row_no              INT           NOT NULL,
    stage               VARCHAR(20)   NOT NULL,
    message             VARCHAR(1000) NOT NULL,
    raw_data            VARCHAR(2000) NULL,
    CONSTRAINT fk_import_errors_job FOREIGN KEY (import_job_id) REFERENCES import_jobs (id),
    INDEX idx_import_errors_job (import_job_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
