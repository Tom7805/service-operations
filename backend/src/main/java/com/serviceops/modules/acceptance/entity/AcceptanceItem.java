package com.serviceops.modules.acceptance.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.acceptance.enums.AcceptanceItemType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Mot dong noi dung cua phieu nghiem thu: cong viec cua hang muc ({@code taskId}) hoac phien ban san
 * pham ban giao ({@code deliverableVersionId}). Ten va so phien ban duoc luu kem de phieu da ky giu
 * nguyen noi dung khi du lieu goc bi doi ten ve sau.
 */
@Getter
@Setter
@Entity
@Table(name = "acceptance_items")
public class AcceptanceItem extends BaseEntity {

	@Column(name = "certificate_id", nullable = false)
	private Long certificateId;

	@Enumerated(EnumType.STRING)
	@Column(name = "item_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private AcceptanceItemType itemType;

	@Column(name = "task_id")
	private Long taskId;

	@Column(name = "deliverable_id")
	private Long deliverableId;

	@Column(name = "deliverable_version_id")
	private Long deliverableVersionId;

	@Column(name = "item_name", nullable = false, length = 255)
	private String itemName;

	@Column(name = "version_no", length = 50)
	private String versionNo;

	@Column(name = "sort_order", nullable = false)
	private Integer sortOrder = 0;
}
