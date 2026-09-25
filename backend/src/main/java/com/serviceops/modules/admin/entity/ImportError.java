package com.serviceops.modules.admin.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.admin.enums.ImportErrorStage;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Mot dong loi cua phien nhap — liet ke lai de nguoi dung sua tep va nhap lan sau (NCL-15-CN-004). */
@Getter
@Setter
@Entity
@Table(name = "import_errors")
public class ImportError extends BaseEntity {

	@Column(name = "import_job_id", nullable = false)
	private Long importJobId;

	@Column(name = "row_no", nullable = false)
	private int rowNumber;

	@Enumerated(EnumType.STRING)
	@Column(name = "stage", nullable = false, columnDefinition = "VARCHAR(20)")
	private ImportErrorStage stage;

	@Column(name = "message", nullable = false, length = 1000)
	private String message;

	@Column(name = "raw_data", length = 2000)
	private String rawData;
}
