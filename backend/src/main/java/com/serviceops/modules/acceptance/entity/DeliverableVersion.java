package com.serviceops.modules.acceptance.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot lan ban giao san pham (NCL-12-CN-004). Bat bien: moi lan ban giao tao ban ghi moi, khong sua
 * de phien ban cu (TC-01). {@code versionNo} duy nhat trong mot san pham (TC-02).
 */
@Getter
@Setter
@Entity
@Table(name = "deliverable_versions")
public class DeliverableVersion extends BaseEntity {

	@Column(name = "deliverable_id", nullable = false)
	private Long deliverableId;

	@Column(name = "version_no", nullable = false, length = 50)
	private String versionNo;

	@Column(name = "delivered_date", nullable = false)
	private LocalDate deliveredDate;

	@Column(name = "receiver_name", nullable = false, length = 255)
	private String receiverName;

	@Column(name = "file_url", length = 500)
	private String fileUrl;

	@Column(length = 1000)
	private String note;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
