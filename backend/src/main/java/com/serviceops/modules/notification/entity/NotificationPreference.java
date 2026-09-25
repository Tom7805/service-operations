package com.serviceops.modules.notification.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.notification.enums.NotificationFrequency;
import com.serviceops.modules.notification.enums.NotificationGroup;
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
 * Cau hinh nhan thong bao cua mot nguoi dung cho mot {@link NotificationGroup} (NCL-14-CN-002).
 * Khong co ban ghi cho mot (user, group) nghia la mac dinh bat + {@link NotificationFrequency#IMMEDIATE}
 * — xem {@code NotificationPreferenceServiceImpl#resolve}.
 */
@Getter
@Setter
@Entity
@Table(name = "notification_preferences",
		uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "notification_group"}))
public class NotificationPreference extends BaseEntity {

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(name = "notification_group", nullable = false, columnDefinition = "VARCHAR(50)")
	private NotificationGroup notificationGroup;

	@Column(name = "enabled", nullable = false)
	private Boolean enabled = true;

	@Enumerated(EnumType.STRING)
	@Column(name = "frequency", nullable = false, columnDefinition = "VARCHAR(20)")
	private NotificationFrequency frequency = NotificationFrequency.IMMEDIATE;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
