package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.project.enums.TemplateItemType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Một đầu việc trong cây của mẫu dự án (NCL-05-CN-007).
 *
 * <p>Cây lồng nhau qua {@code parentId}: hạng mục con trỏ tới hạng mục cha, công việc
 * trỏ tới hạng mục hoặc công việc cha. Khi dựng dự án từ mẫu, các bản ghi này chỉ được
 * <b>sao chép giá trị</b> sang WorkPackage/Task của dự án — mẫu gốc không tham chiếu
 * tới dự án nên mọi chỉnh sửa trên dự án không ảnh hưởng mẫu (TC-02).</p>
 */
@Getter
@Setter
@Entity
@Table(name = "project_template_items")
public class ProjectTemplateItem extends BaseEntity {

	@Column(name = "template_id", nullable = false)
	private Long templateId;

	@Column(name = "parent_id")
	private Long parentId;

	@Enumerated(EnumType.STRING)
	@Column(name = "item_type", nullable = false, columnDefinition = "VARCHAR(30)")
	private TemplateItemType itemType;

	@Column(nullable = false, length = 255)
	private String name;

	@Column(columnDefinition = "TEXT")
	private String description;

	@Column(name = "sort_order", nullable = false)
	private Integer sortOrder = 0;

	@Column(name = "suggested_budget_hours", precision = 10, scale = 2)
	private BigDecimal suggestedBudgetHours;
}
