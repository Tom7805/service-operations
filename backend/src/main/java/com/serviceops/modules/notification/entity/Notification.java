package com.serviceops.modules.notification.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

	@Column(name = "recipient_id", nullable = false)
	private Long recipientId;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, columnDefinition = "VARCHAR(50)")
	private NotificationType type;

	@Column(name = "title", nullable = false, length = 255)
	private String title;

	@Column(name = "content", columnDefinition = "TEXT")
	private String content;

	@Enumerated(EnumType.STRING)
	@Column(name = "channel", nullable = false, columnDefinition = "VARCHAR(20)")
	private NotificationChannel channel;

	@Column(name = "reference_id")
	private Long referenceId;

	@Column(name = "reference_type", length = 50)
	private String referenceType;

	@Column(name = "is_read", nullable = false)
	private Boolean isRead = false;

	@Column(name = "read_at")
	private LocalDateTime readAt;

	@Column(name = "sent_at", nullable = false)
	private LocalDateTime sentAt;
}