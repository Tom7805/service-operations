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
 * Ghi nhan "da gui thong bao {eventType}/{referenceId} cho {recipientId} o dot {episodeNo} nay
 * roi" (NCL-14-CN-003, QTN-27-TC-01) — bang append-only rieng, KHONG dung chung voi
 * {@code notifications} de tranh phai them constraint len du lieu cu cua cac co che chong trung
 * rieng da co (margin alert/timesheet reminder/dunning — xem {@link NotificationAlertState}).
 */
@Getter
@Setter
@Entity
@Table(name = "notification_alert_dedup_logs",
		uniqueConstraints = @UniqueConstraint(
				columnNames = {"event_type", "reference_id", "recipient_id", "episode_no"}))
public class NotificationAlertDedupLog extends BaseEntity {

	@Enumerated(EnumType.STRING)
	@Column(name = "event_type", nullable = false, columnDefinition = "VARCHAR(50)")
	private NotificationType eventType;

	@Column(name = "reference_id", nullable = false)
	private Long referenceId;

	@Column(name = "recipient_id", nullable = false)
	private Long recipientId;

	@Column(name = "episode_no", nullable = false)
	private Integer episodeNo;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
