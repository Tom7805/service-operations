package com.serviceops.modules.project.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * NCL-05-CN-008: hang muc phai hoan thanh cua moc tien do — lien ket voi cong viec (Task)
 * trong cay cong viec cua du an de he thong tu biet hang muc da xong chua.
 */
@Getter
@Setter
@Entity
@Table(name = "project_milestone_items")
public class ProjectMilestoneItem extends BaseEntity {

	@Column(name = "milestone_id", nullable = false)
	private Long milestoneId;

	@Column(name = "task_id", nullable = false)
	private Long taskId;
}
