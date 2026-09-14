package com.serviceops.modules.opportunity.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.opportunity.enums.ActivityType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Mot hoat dong cham soc cua co hoi (NCL-03-CN-006): mot lan goi dien, gap
 * mat, gui thu hoac ghi chu khac gan voi mot co hoi cu the — nhieu hoat dong
 * cua cung mot co hoi tao thanh dong thoi gian cham soc cua co hoi do.
 */
@Getter
@Setter
@Entity
@Table(name = "opportunity_activities")
public class OpportunityActivity extends BaseEntity {

	@Column(name = "opportunity_id", nullable = false)
	private Long opportunityId;

	@Enumerated(EnumType.STRING)
	@Column(name = "activity_type", nullable = false, columnDefinition = "VARCHAR(20)")
	private ActivityType activityType;

	/** Thoi diem hoat dong dien ra thuc te (khac {@link #createdAt} la thoi diem ghi nhan vao he thong). */
	@Column(name = "occurred_at", nullable = false)
	private LocalDateTime occurredAt;

	/** Nguoi tham gia hoat dong (dang van ban tu do, vi du "Nguyen Van A (khach hang), sale01"). */
	@Column(name = "participants", length = 500)
	private String participants;

	@Column(name = "content", nullable = false, length = 2000)
	private String content;

	@Column(name = "created_by", length = 100)
	private String createdBy;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
