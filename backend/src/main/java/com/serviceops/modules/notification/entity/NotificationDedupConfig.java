package com.serviceops.modules.notification.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.notification.enums.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Cau hinh chong gui trung theo tung loai su kien (NCL-14-CN-003, QTN-27) — chi Quan tri vien
 * (VT-07) duoc sua (xem {@code NotificationDedupConfigController}). Loai su kien khong co ban ghi
 * rieng se dung mac dinh: bat chong trung, khong cooldown (xem
 * {@code NotificationDedupConfigServiceImpl#getConfigs}).
 */
@Getter
@Setter
@Entity
@Table(name = "notification_dedup_configs", uniqueConstraints = @UniqueConstraint(columnNames = "event_type"))
public class NotificationDedupConfig extends BaseEntity {

	@Enumerated(EnumType.STRING)
	@Column(name = "event_type", nullable = false, columnDefinition = "VARCHAR(50)")
	private NotificationType eventType;

	@Column(name = "dedup_enabled", nullable = false)
	private Boolean dedupEnabled;

	/** So gio toi thieu giua 2 lan nhac trong cung mot dot canh bao (episode); null = khong nhac lai. */
	@Column(name = "cooldown_hours")
	private Integer cooldownHours;

	@Column(name = "updated_by", length = 100)
	private String updatedBy;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;
}
