-- Epic NCL-12: Nghiem thu va ban giao.
-- V11 (placeholder rong) da duoc ap tren CSDL cua ca nhom nen khong sua lai (doi checksum se lam
-- Flyway validate that bai); toan bo bang cua Epic nay tao o day.

-- NCL-12-CN-004: san pham ban giao gan voi hang muc, moi lan ban giao la mot phien ban bat bien.
CREATE TABLE deliverables (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id        BIGINT NOT NULL,
    work_package_id   BIGINT NOT NULL,
    name              VARCHAR(255) NOT NULL,
    deliverable_type  VARCHAR(30) NOT NULL,
    description       VARCHAR(1000) NULL,
    created_by        VARCHAR(100) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_deliverables_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_deliverables_work_package FOREIGN KEY (work_package_id) REFERENCES work_packages (id),
    CONSTRAINT uq_deliverables_package_name UNIQUE (work_package_id, name),
    INDEX idx_deliverables_project (project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- TC-02: trung so phien ban trong cung mot san pham bi chan ca o tang CSDL.
CREATE TABLE deliverable_versions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    deliverable_id  BIGINT NOT NULL,
    version_no      VARCHAR(50) NOT NULL,
    delivered_date  DATE NOT NULL,
    receiver_name   VARCHAR(255) NOT NULL,
    file_url        VARCHAR(500) NULL,
    note            VARCHAR(1000) NULL,
    created_by      VARCHAR(100) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deliverable_versions_deliverable FOREIGN KEY (deliverable_id) REFERENCES deliverables (id),
    CONSTRAINT uq_deliverable_versions_no UNIQUE (deliverable_id, version_no),
    INDEX idx_deliverable_versions_delivered (deliverable_id, delivered_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- NCL-12-CN-001/002/003: phieu nghiem thu hang muc.
-- contract_milestone_id UNIQUE: mot moc thanh toan chi gan voi mot phieu (NULL duoc lap lai).
CREATE TABLE acceptance_certificates (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    certificate_code       VARCHAR(50) NOT NULL,
    project_id             BIGINT NOT NULL,
    work_package_id        BIGINT NOT NULL,
    title                  VARCHAR(255) NOT NULL,
    accepted_value         DECIMAL(18,2) NOT NULL,
    note                   VARCHAR(1000) NULL,
    status                 VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    revision_no            INT NOT NULL DEFAULT 1,
    contract_milestone_id  BIGINT NULL,
    linked_by              VARCHAR(100) NULL,
    linked_at              DATETIME NULL,
    signer_name            VARCHAR(255) NULL,
    signed_date            DATE NULL,
    minutes_url            VARCHAR(500) NULL,
    confirmation_channel   VARCHAR(20) NULL,
    confirmed_by           VARCHAR(100) NULL,
    confirmed_at           DATETIME NULL,
    last_rejection_reason  VARCHAR(1000) NULL,
    created_by             VARCHAR(100) NULL,
    created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_acceptance_certificates_code UNIQUE (certificate_code),
    CONSTRAINT uq_acceptance_certificates_milestone UNIQUE (contract_milestone_id),
    CONSTRAINT fk_acceptance_certificates_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT fk_acceptance_certificates_work_package FOREIGN KEY (work_package_id) REFERENCES work_packages (id),
    CONSTRAINT fk_acceptance_certificates_milestone FOREIGN KEY (contract_milestone_id) REFERENCES contract_milestones (id),
    INDEX idx_acceptance_certificates_project (project_id),
    INDEX idx_acceptance_certificates_package (work_package_id, status),
    INDEX idx_acceptance_certificates_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Anh chup noi dung phieu tai thoi diem lap/nop lai: cong viec va phien ban san pham ban giao.
-- Luu kem ten/so phien ban de phieu da ky khong doi noi dung khi du lieu goc thay doi ve sau.
CREATE TABLE acceptance_items (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    certificate_id          BIGINT NOT NULL,
    item_type               VARCHAR(20) NOT NULL,
    task_id                 BIGINT NULL,
    deliverable_id          BIGINT NULL,
    deliverable_version_id  BIGINT NULL,
    item_name               VARCHAR(255) NOT NULL,
    version_no              VARCHAR(50) NULL,
    sort_order              INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_acceptance_items_certificate FOREIGN KEY (certificate_id) REFERENCES acceptance_certificates (id),
    INDEX idx_acceptance_items_certificate (certificate_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- NCL-12-CN-002: lich su xac nhan/tu choi cua khach hang (khong ghi de), phuc vu truy vet tranh chap.
CREATE TABLE acceptance_decisions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    certificate_id  BIGINT NOT NULL,
    decision        VARCHAR(20) NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    revision_no     INT NOT NULL,
    signer_name     VARCHAR(255) NULL,
    signed_date     DATE NULL,
    minutes_url     VARCHAR(500) NULL,
    reason          VARCHAR(1000) NULL,
    recorded_by     VARCHAR(100) NULL,
    recorded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_acceptance_decisions_certificate FOREIGN KEY (certificate_id) REFERENCES acceptance_certificates (id),
    INDEX idx_acceptance_decisions_certificate (certificate_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
